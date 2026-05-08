export class ProxyError extends Error {
  /**
   * @param {number} status - HTTP status code
   * @param {string} message - Error message from proxy
   * @param {string} [code] - Machine-readable error code (e.g. "insufficient_balance")
   */
  constructor(status, message, code) {
    super(message);
    this.name = 'ProxyError';
    this.status = status;
    this.code = code || null;
  }

  get isInsufficientBalance() {
    return this.status === 402 && this.code === 'insufficient_balance';
  }
}

export class InsufficientBalanceError extends ProxyError {
  constructor(message) {
    super(402, message, 'insufficient_balance');
    this.name = 'InsufficientBalanceError';
  }
}
