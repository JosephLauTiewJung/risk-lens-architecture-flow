import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  Database,
  Cpu,
  Server,
  FileText,
  CheckCircle,
  Clock,
  Trash2,
} from "lucide-react";

const anchorDefaults = { x: "center", y: "center" } as const;

type AnchorAxis = "left" | "center" | "right";
type AnchorY = "top" | "center" | "bottom";
type Anchor = { x?: AnchorAxis; y?: AnchorY };
type Point = { x: number; y: number };
type PathContext = { start: Point; end: Point };

type ConnectorDef = {
  id: string;
  from: string;
  to: string;
  stepIndex: number;
  delay: number;
  withArrow?: boolean;
  startAnchor?: Anchor;
  endAnchor?: Anchor;
  via?: Array<(ctx: PathContext) => Point>;
};

type ComputedConnector = {
  id: string;
  d: string;
  stepIndex: number;
  delay: number;
  withArrow: boolean;
};

const buildPath = (points: Point[]) =>
  points.reduce(
    (path, point, index) =>
      index === 0
        ? `M ${point.x} ${point.y}`
        : `${path} L ${point.x} ${point.y}`,
    "",
  );

const getAnchorPoint = (
  rect: DOMRect,
  containerRect: DOMRect,
  anchor: Anchor = anchorDefaults,
): Point => {
  const xKey = anchor.x ?? anchorDefaults.x;
  const yKey = anchor.y ?? anchorDefaults.y;

  const x =
    xKey === "left"
      ? rect.left - containerRect.left
      : xKey === "right"
        ? rect.right - containerRect.left
        : rect.left - containerRect.left + rect.width / 2;

  const y =
    yKey === "top"
      ? rect.top - containerRect.top
      : yKey === "bottom"
        ? rect.bottom - containerRect.top
        : rect.top - containerRect.top + rect.height / 2;

  return { x, y };
};

const createBranch = (
  ratio: number,
): NonNullable<ConnectorDef["via"]> => [
  ({ start, end }) => {
    const offset = (end.y - start.y) * ratio;
    return { x: start.x, y: start.y + offset };
  },
  ({ start, end }) => {
    const offset = (end.y - start.y) * ratio;
    return { x: end.x, y: start.y + offset };
  },
];

const createElbow = (
  ratio: number,
): NonNullable<ConnectorDef["via"]> => [
  ({ start, end }) => {
    const y = start.y + (end.y - start.y) * ratio;
    return { x: start.x, y };
  },
  ({ start, end }) => {
    const y = start.y + (end.y - start.y) * ratio;
    return { x: end.x, y };
  },
];

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [loop, setLoop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Record<string, HTMLElement | null>>({});
  const [nodeVersion, setNodeVersion] = useState(0);
  const registerNode = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      if (nodeRefs.current[id] === element) return;
      nodeRefs.current[id] = element;
      setNodeVersion((value) => value + 1);
    },
    [],
  );
  const connectors = useMemo<ConnectorDef[]>(
    () => [
      {
        id: "frontend-loan",
        from: "frontend",
        to: "loan",
        stepIndex: 0,
        delay: 0,
        startAnchor: { x: "right", y: "center" },
        endAnchor: { x: "left", y: "center" },
      },
      {
        id: "loan-backend",
        from: "loan",
        to: "backend",
        stepIndex: 1,
        delay: 0.3,
        startAnchor: { x: "right", y: "center" },
        endAnchor: { x: "left", y: "center" },
      },
      {
        id: "backend-gemini",
        from: "backend",
        to: "gemini",
        stepIndex: 2,
        delay: 0.6,
        startAnchor: { x: "right", y: "center" },
        endAnchor: { x: "left", y: "center" },
      },
      {
        id: "gemini-langchain",
        from: "gemini",
        to: "langchain",
        stepIndex: 3,
        delay: 0.9,
        startAnchor: { x: "center", y: "bottom" },
        endAnchor: { x: "center", y: "top" },
        via: createBranch(0.5),
      },
      {
        id: "langchain-company",
        from: "langchain",
        to: "company",
        stepIndex: 4,
        delay: 1.2,
        startAnchor: { x: "center", y: "bottom" },
        endAnchor: { x: "center", y: "top" },
        via: createBranch(0.35),
      },
      {
        id: "langchain-customer",
        from: "langchain",
        to: "customer",
        stepIndex: 4,
        delay: 1.25,
        startAnchor: { x: "center", y: "bottom" },
        endAnchor: { x: "center", y: "top" },
        via: createBranch(0.35),
      },
      {
        id: "langchain-past",
        from: "langchain",
        to: "past",
        stepIndex: 4,
        delay: 1.3,
        startAnchor: { x: "center", y: "bottom" },
        endAnchor: { x: "center", y: "top" },
        via: createBranch(0.35),
      },
      {
        id: "customer-risk",
        from: "customer",
        to: "risk",
        stepIndex: 4,
        delay: 1.6,
        startAnchor: { x: "center", y: "bottom" },
        endAnchor: { x: "center", y: "top" },
        via: createElbow(0.8),
      },
      {
        id: "past-session",
        from: "past",
        to: "session",
        stepIndex: 5,
        delay: 2.1,
        startAnchor: { x: "center", y: "bottom" },
        endAnchor: { x: "center", y: "top" },
        via: createElbow(0.8),
      },
      {
        id: "session-prune",
        from: "session",
        to: "prune",
        stepIndex: 6,
        delay: 2.5,
        startAnchor: { x: "right", y: "center" },
        endAnchor: { x: "left", y: "center" },
      },
        {
            id: "summarize-past",
            from: "prune",
            to: "past",
            stepIndex: 7,
            delay: 2.1,
            startAnchor: { x: "center", y: "top" },
            endAnchor: { x: "right", y: "center" },
            via: createElbow(1),
        },

    ],
    [],
  );
  const [paths, setPaths] = useState<ComputedConnector[]>([]);

  useEffect(() => {
    const steps = 9; // Total animation steps (was 8)
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= steps - 1) {
          setLoop((l) => l + 1);
          return 0;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const computePaths = () => {
      if (!containerRef.current) return;
      const containerRect =
        containerRef.current.getBoundingClientRect();
      const updated: ComputedConnector[] = [];

      connectors.forEach((connector) => {
        const fromEl = nodeRefs.current[connector.from];
        const toEl = nodeRefs.current[connector.to];
        if (!fromEl || !toEl) return;

        const start = getAnchorPoint(
          fromEl.getBoundingClientRect(),
          containerRect,
          connector.startAnchor,
        );
        const end = getAnchorPoint(
          toEl.getBoundingClientRect(),
          containerRect,
          connector.endAnchor,
        );
        const viaPoints = connector.via?.map((fn) => fn({ start, end })) ?? [];
        updated.push({
          id: connector.id,
          d: buildPath([start, ...viaPoints, end]),
          delay: connector.delay,
          stepIndex: connector.stepIndex,
          withArrow: connector.withArrow ?? true,
        });
      });

      setPaths(updated);
    };

    const handleResize = () => computePaths();
    computePaths();
    window.addEventListener("resize", handleResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(handleResize);
      if (containerRef.current) {
        observer.observe(containerRef.current);
      }
      Object.values(nodeRefs.current).forEach((node) => {
        if (node instanceof Element) observer?.observe(node);
      });
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, [connectors, nodeVersion]);

  return (
    <div className="min-h-screen bg-black text-white p-8 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-block px-4 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full mb-4"
        >
          <span className="text-emerald-400 tracking-wider">
            RISK LENS
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-4"
        >
          AI-Powered Loan Risk Assessment
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-gray-400 max-w-2xl mx-auto"
        >
          Intelligent loan processing with RAG-powered context
          retrieval and automated risk scoring
        </motion.p>
      </div>

      {/* Flowchart */}
      <div
        className="max-w-7xl mx-auto relative"
        ref={containerRef}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            <linearGradient
              id="mintGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop
                offset="0%"
                stopColor="#10b981"
                stopOpacity="0"
              />
              <stop
                offset="50%"
                stopColor="#10b981"
                stopOpacity="1"
              />
              <stop
                offset="100%"
                stopColor="#10b981"
                stopOpacity="0"
              />
            </linearGradient>
            
            {/* Arrow marker */}
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="#10b981"
                style={{ filter: "drop-shadow(0 0 2px rgba(16, 185, 129, 0.8))" }}
              />
            </marker>
          </defs>

          {paths.map((path) => (
            <AnimatedPath
              d={path.d}
              active={activeStep >= path.stepIndex}
              delay={path.delay}
              withArrow={path.withArrow}
            />
          ))}
        </svg>

        {/* Row 1: Main Flow */}
        <div
          className="relative flex items-start justify-center gap-24 mb-32"
        >
          {/* Frontend */}
          <FlowNode
            icon={<Server className="size-8" />}
            title="React/Vite Frontend"
            subtitle="User Interface"
            active={activeStep >= 0}
            delay={0}
            nodeRef={registerNode("frontend")}
          />

          {/* Loan Request */}
          <FlowNode
            icon={<FileText className="size-8" />}
            title="Loan Request"
            subtitle="User Submission"
            active={activeStep >= 0}
            delay={0.2}
            small
            nodeRef={registerNode("loan")}
          />

          {/* Backend */}
          <FlowNode
            icon={<Server className="size-8" />}
            title="FastAPI Backend"
            subtitle="Orchestration Layer"
            active={activeStep >= 1}
            delay={0.5}
            nodeRef={registerNode("backend")}
          />

          {/* Google Gemini */}
          <FlowNode
            icon={<Cpu className="size-8" />}
            title="Google Gemini AI"
            subtitle="Core Intelligence"
            active={activeStep >= 2}
            delay={0.8}
            highlight
            nodeRef={registerNode("gemini")}
          />
        </div>

        {/* Row 2: AI Layer */}
        <div
          className="relative flex items-center justify-center mb-32"
        >
          <FlowNode
            icon={<Database className="size-8" />}
            title="LangChain"
            subtitle="Context Retrieval"
            active={activeStep >= 3}
            delay={1.1}
            nodeRef={registerNode("langchain")}
          />
        </div>

        {/* Row 3: Vector Stores */}
        <div
          className="relative flex items-start justify-center gap-8 mb-32"
        >
          <DatabaseNode
            title="Company Data"
            subtitle="Policies & Guidelines"
            active={activeStep >= 3}
            delay={1.3}
            nodeRef={registerNode("company")}
          />
          <DatabaseNode
            title="Customer Data"
            subtitle="User History"
            active={activeStep >= 3}
            delay={1.4}
            nodeRef={registerNode("customer")}
          />
          <DatabaseNode
            title="Past Evaluations"
            subtitle="Historical Records"
            active={activeStep >= 3}
            delay={1.5}
            highlight={activeStep >= 6}
            nodeRef={registerNode("past")}
          />
        </div>

        {/* Row 4: Results */}
        <div
          className="relative flex items-start justify-between"
        >
          <div className="flex gap-8">
            <FlowNode
              icon={<CheckCircle className="size-8" />}
              title="Risk Score"
              subtitle="Analysis Result"
              active={activeStep >= 4}
              delay={1.7}
              nodeRef={registerNode("risk")}
            />
          </div>

          <div className="flex gap-8">
            <FlowNode
              icon={<Clock className="size-6" />}
              title="Session > 1 Week?"
              subtitle="Maintenance Check"
              active={activeStep >= 6}
              delay={2.3}
              small
              nodeRef={registerNode("session")}
            />

            <FlowNode
              icon={<Trash2 className="size-6" />}
              title="Summarize & Prune"
              subtitle="Data Optimization"
              active={activeStep >= 7}
              delay={2.5}
              small
              highlight={activeStep >= 7}
              nodeRef={registerNode("prune")}
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
        className="max-w-4xl mx-auto mt-16 p-6 border border-emerald-500/20 rounded-lg bg-emerald-500/5"
      >
        <h3 className="text-emerald-400 mb-4">
          System Pipeline
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-400">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500"></div>
            <span>Submission</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500"></div>
            <span>Orchestration</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500"></div>
            <span>RAG Retrieval</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500"></div>
            <span>Risk Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500"></div>
            <span>Result Display</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500"></div>
            <span>Storage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500"></div>
            <span>Maintenance</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FlowNode({
  icon,
  title,
  subtitle,
  active,
  delay,
  small = false,
  highlight = false,
  nodeRef,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  active: boolean;
  delay: number;
  small?: boolean;
  highlight?: boolean;
  nodeRef?: (node: HTMLDivElement | null) => void;
}) {
  return (
    <motion.div
      ref={nodeRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: active ? 1 : 0.3,
        scale: active ? 1 : 0.9,
      }}
      transition={{ duration: 0.5, delay }}
      className={`${
        small ? "w-32" : "w-40"
      } flex flex-col items-center text-center`}
    >
      <div
        className={`${
          small ? "size-16" : "size-24"
        } rounded-xl border ${
          highlight
            ? "border-emerald-500 bg-emerald-500/20"
            : "border-emerald-500/30 bg-emerald-500/5"
        } flex items-center justify-center mb-3 relative overflow-hidden group`}
      >
        {active && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />
        )}
        <div className="text-emerald-400 relative z-10">
          {icon}
        </div>
      </div>
      <h4
        className={`${small ? "text-xs" : ""} text-white mb-1`}
      >
        {title}
      </h4>
      <p className={`${small ? "text-xs" : ""} text-gray-500`}>
        {subtitle}
      </p>
    </motion.div>
  );
}

function DatabaseNode({
  title,
  subtitle,
  active,
  delay,
  highlight = false,
  nodeRef,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  delay: number;
  highlight?: boolean;
  nodeRef?: (node: HTMLDivElement | null) => void;
}) {
  return (
    <motion.div
      ref={nodeRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: active ? 1 : 0.3,
        y: 0,
      }}
      transition={{ duration: 0.5, delay }}
      className="w-48 relative"
    >
      <div
        className={`p-4 rounded-lg border ${
          highlight
            ? "border-emerald-500 bg-emerald-500/20"
            : "border-emerald-500/30 bg-emerald-500/5"
        } backdrop-blur-sm`}
      >
        <div className="flex items-center gap-3 mb-2">
          <Database className="size-6 text-emerald-400" />
          <div className="flex-1">
            <div className="h-2 bg-emerald-500/20 rounded mb-1"></div>
            <div className="h-2 bg-emerald-500/10 rounded w-2/3"></div>
          </div>
        </div>
        <h4 className="text-white mb-1">{title}</h4>
        <p className="text-gray-500">{subtitle}</p>
      </div>
      {active && (
        <motion.div
          className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0 rounded-lg -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      )}
    </motion.div>
  );
}

function AnimatedPath({
  d,
  active,
  delay,
  withArrow = false,
}: {
  d: string;
  active: boolean;
  delay: number;
  withArrow?: boolean;
}) {
  return (
    <motion.path
      d={d}
      stroke="#10b981"
      strokeWidth="2"
      fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{
        pathLength: active ? 1 : 0,
        opacity: active ? 1 : 0,
      }}
      transition={{
        pathLength: { duration: 0.5, delay, ease: "easeInOut" },
        opacity: { duration: 0.2, delay },
      }}
      style={{
        filter: "drop-shadow(0 0 4px rgba(16, 185, 129, 0.6))",
      }}
      markerEnd={withArrow ? "url(#arrowhead)" : undefined}
    />
  );
}