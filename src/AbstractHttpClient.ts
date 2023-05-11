import {
  HttpExceptionHandler,
  HandleHttpExceptionOutput,
} from './exception/exception-handlers';
import { PublicApiClientException } from './exception';

export enum HttpClientSecurity {
  TOKEN = 'token',
  API_KEY = 'apikey',
}

export abstract class AbstractHttpClient {
  /**
   * Base path for HTTP calls
   */
  protected basePath = '';
  /**
   * Current path for HTTP calls
   */
  protected path = '';
  /**
   * Token to authenticate the user
   */
  protected token = '';
  /**
   * ArrowSphere API URL
   */
  protected url = '';
  /**
   * Http Exceptions Handlers
   */
  protected httpExceptionHandlers: HttpExceptionHandler[] = [];
  /**
   * Security used to auth on server
   * Default to API_KEY to handle
   * the existing codebase
   */
  protected security: HttpClientSecurity = HttpClientSecurity.API_KEY;

  public setToken(token: string): this {
    this.token = token;

    return this;
  }

  public setUrl(url: string): this {
    this.url = url;

    return this;
  }

  public setSecurity(security: HttpClientSecurity): this {
    this.security = security;

    return this;
  }

  /**
   * Allow to register error/exception handler.
   * Handlers can be developed in another projects as long as they respect the interface HttpExceptionHandler.
   */
  public registerHttpExceptionHandler(handler: HttpExceptionHandler): this {
    this.httpExceptionHandlers.push(handler);

    return this;
  }

  /**
   * Will find appropriate ErrorHandlers and apply them to the error in order of registering.
   */
  protected async handleError(
    error: PublicApiClientException,
  ): Promise<HandleHttpExceptionOutput> {
    const appropriateHandlers: HttpExceptionHandler[] = this.httpExceptionHandlers.filter(
      (handler) => handler.getHandledHttpStatuses().includes(error.httpCode),
    );

    // handle retry
    const output: HandleHttpExceptionOutput = { mustRetry: false };

    for (const handler of appropriateHandlers) {
      const res: HandleHttpExceptionOutput = await handler.handle(error, {
        setToken: this.setToken,
      });
      output.mustRetry = res.mustRetry;
    }

    return output;
  }

  protected mapToPublicApiException(error: any): PublicApiClientException {
    return new PublicApiClientException(
      error?.message,
      String(error),
      error?.response?.status,
      error?.response?.config,
    );
  }
}