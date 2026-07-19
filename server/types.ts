// Re-export the shared domain types so the server and client stay in sync
// without duplicating type definitions in two places.
export type {
  VehicleStatus,
  Driver,
  Supervisor,
  VehicleDocument,
  ServiceLog,
  BatteryLog,
  TyreLog,
  RevenueEntry,
  AccidentReport,
  VehiclePhoto,
  Valuation,
  Vehicle,
} from '../src/types/fleet';
