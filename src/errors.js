export class ProxyError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} message - Error message from proxy
   */
  constructor(status, message) {
    super(message);
    this.name = 'ProxyError';
    this.status = status;
  }
}
