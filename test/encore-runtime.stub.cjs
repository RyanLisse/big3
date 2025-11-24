"use strict";
// Minimal Encore runtime stub for tests in the root package.
// Avoids requiring the native Encore runtime during unit tests.
class Runtime {
  constructor(config = {}) {
    this.config = config;
  }

  static version() {
    return "stub-runtime";
  }

  secret(name) {
    const value = process.env[name];
    if (value === undefined) {
      return null;
    }

    return {
      cached: () => value,
    };
  }
}

const noop = class {};

module.exports = {
  APICallError: class extends Error {},
  ApiCallError: class extends Error {},
  BodyReader: noop,
  Bucket: noop,
  BucketObject: noop,
  CloudProvider: noop,
  Cursor: noop,
  Decimal: noop,
  EnvironmentType: noop,
  Gateway: noop,
  ListEntry: noop,
  ListIterator: noop,
  LogLevel: noop,
  Logger: noop,
  ObjectAttrs: noop,
  ObjectErrorKind: noop,
  PubSubSubscription: noop,
  PubSubTopic: noop,
  QueryArgs: noop,
  Request: noop,
  ResponseWriter: noop,
  Row: noop,
  Runtime,
  SQLConn: noop,
  SQLDatabase: noop,
  Secret: noop,
  Sink: noop,
  Socket: noop,
  SqlConn: noop,
  SqlDatabase: noop,
  Stream: noop,
  Transaction: noop,
  TypedObjectError: noop,
  WebSocketClient: noop,
};
