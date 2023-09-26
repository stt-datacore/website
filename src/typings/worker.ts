declare module "worker-loader!*" {
  // You need to change `Worker`, if you specified a different value for the `workerType` option
  
  /**
   * Unified Worker for various voyage calculations
   */
  class UnifiedWorker extends Worker {
    constructor();
  }

  // Uncomment this if you set the `esModule` option to `false`
  // export = WebpackWorker;
  export default UnifiedWorker;
}