import express from "express";

// Forwards rejected promises from async controllers to the error handler
export const apExpressAsyncHandler = (fn: any) =>
  function asyncUtilWrap(...args: Parameters<express.RequestHandler>) {
    const fnReturn = fn(...args);
    const next: any = args[args.length - 1];
    return Promise.resolve(fnReturn).catch(next);
  };
