/**
 * Type declarations for prom-client
 * prom-client includes its own types, but this ensures TypeScript resolution
 */

declare module "prom-client" {
  export class Registry {
    constructor();
    getSingleMetric(name: string): Metric | undefined;
    getMetricsAsArray(): Promise<Metric[]>;
    getMetricsAsJSON(): Promise<any>;
    resetMetrics(): void;
    clear(): void;
    register(metric: Metric): void;
    removeSingleMetric(name: string): void;
  }

  export interface Metric {
    name: string;
    help: string;
    type: string;
    aggregator: string;
    reset(): void;
    get(): Promise<any>;
  }

  export interface CounterConfiguration {
    name: string;
    help: string;
    labelNames?: string[];
    registers?: Registry[];
  }

  export class Counter implements Metric {
    constructor(configuration: CounterConfiguration);
    inc(labels?: Record<string, string | number>, value?: number): void;
    inc(value?: number): void;
    reset(): void;
    get(): Promise<any>;
    name: string;
    help: string;
    type: string;
    aggregator: string;
  }

  export interface HistogramConfiguration {
    name: string;
    help: string;
    labelNames?: string[];
    buckets?: number[];
    registers?: Registry[];
  }

  export class Histogram implements Metric {
    constructor(configuration: HistogramConfiguration);
    observe(labels?: Record<string, string | number>, value?: number): void;
    observe(value?: number): void;
    reset(): void;
    get(): Promise<any>;
    name: string;
    help: string;
    type: string;
    aggregator: string;
  }

  export interface GaugeConfiguration {
    name: string;
    help: string;
    labelNames?: string[];
    registers?: Registry[];
  }

  export class Gauge implements Metric {
    constructor(configuration: GaugeConfiguration);
    set(value: number, labels?: Record<string, string | number>): void;
    inc(value?: number, labels?: Record<string, string | number>): void;
    dec(value?: number, labels?: Record<string, string | number>): void;
    reset(): void;
    get(): Promise<any>;
    name: string;
    help: string;
    type: string;
    aggregator: string;
  }
}

