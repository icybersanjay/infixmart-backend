// JS re-export shim — see returns.ts for the real implementation.
export {
  createReturnRequest,
  findActiveReturnForOrder,
  findReturnById,
  listReturns,
  listReturnsByUserId,
  updateReturnStatus,
} from "./returns.ts";
