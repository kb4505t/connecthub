// Augments Express's Request type globally so `req.user` is typed in every
// controller after the `authenticate` middleware runs, without needing to
// cast or redeclare it per-file.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export {};
