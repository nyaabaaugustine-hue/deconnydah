import type {
  Vehicle, Driver, Supervisor, VehicleDocument,
  ServiceLog, BatteryLog, TyreLog, RevenueEntry,
  AccidentReport, VehiclePhoto, Valuation,
} from '@/types/fleet';

export const supervisors: Supervisor[] = [
  { id: 'sup-1', fullName: 'Kwame Mensah', phone: '+233 24 111 2222', region: 'Greater Accra' },
  { id: 'sup-2', fullName: 'Ama Boateng', phone: '+233 20 333 4444', region: 'Ashanti' },
  { id: 'sup-3', fullName: 'Yaw Owusu', phone: '+233 27 555 6666', region: 'Western' },
];

export const drivers: Driver[] = [
  { id: 'drv-1', fullName: 'Kofi Asante', phone: '+233 24 100 2001', licenseNumber: 'B.123456', supervisorId: 'sup-1', hireDate: '2022-03-15', status: 'active' },
  { id: 'drv-2', fullName: 'Akosua Frimpong', phone: '+233 24 100 2002', licenseNumber: 'B.123457', supervisorId: 'sup-1', hireDate: '2023-01-20', status: 'active' },
  { id: 'drv-3', fullName: 'Ekow Danso', phone: '+233 24 100 2003', licenseNumber: 'B.123458', supervisorId: 'sup-2', hireDate: '2021-06-10', status: 'active' },
  { id: 'drv-4', fullName: 'Adwoa Nyarko', phone: '+233 24 100 2004', licenseNumber: 'B.123459', supervisorId: 'sup-2', hireDate: '2023-09-05', status: 'active' },
  { id: 'drv-5', fullName: 'Kwabena Tuffour', phone: '+233 24 100 2005', licenseNumber: 'B.123460', supervisorId: 'sup-3', hireDate: '2022-11-30', status: 'active' },
  { id: 'drv-6', fullName: 'Abena Sarpong', phone: '+233 24 100 2006', licenseNumber: 'B.123461', supervisorId: 'sup-3', hireDate: '2024-02-14', status: 'active' },
];

export const vehicles: Vehicle[] = [
  { id: 'veh-1', plateNumber: 'GR-2841-21', make: 'Toyota', model: 'Hilux', year: 2021, vin: 'JTEBN14J1M0123456', purchaseDate: '2021-05-10', purchasePrice: 380000, status: 'active', currentDriverId: 'drv-1' },
  { id: 'veh-2', plateNumber: 'AS-5532-22', make: 'Isuzu', model: 'D-Max', year: 2022, vin: 'JTEBN14J2M0123457', purchaseDate: '2022-08-22', purchasePrice: 420000, status: 'active', currentDriverId: 'drv-3' },
  { id: 'veh-3', plateNumber: 'WR-1198-20', make: 'Mitsubishi', model: 'L200', year: 2020, vin: 'JTEBN14J3M0123458', purchaseDate: '2020-03-15', purchasePrice: 310000, status: 'in_repair', currentDriverId: 'drv-4' },
  { id: 'veh-4', plateNumber: 'GR-7765-23', make: 'Ford', model: 'Ranger', year: 2023, vin: 'JTEBN14J4M0123459', purchaseDate: '2023-11-01', purchasePrice: 480000, status: 'active', currentDriverId: 'drv-2' },
  { id: 'veh-5', plateNumber: 'AS-3301-19', make: 'Nissan', model: 'Navara', year: 2019, vin: 'JTEBN14J5M0123460', purchaseDate: '2019-07-18', purchasePrice: 290000, status: 'active', currentDriverId: 'drv-5' },
  { id: 'veh-6', plateNumber: 'WR-9023-24', make: 'Toyota', model: 'Land Cruiser', year: 2024, vin: 'JTEBN14J6M0123461', purchaseDate: '2024-01-20', purchasePrice: 620000, status: 'active', currentDriverId: 'drv-6' },
];

const today = new Date();
const daysFromNow = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};
const daysAgo = (days: number) => daysFromNow(-days);

export const vehicleDocuments: VehicleDocument[] = [
  { id: 'doc-1', vehicleId: 'veh-1', docType: 'insurance_policy', fileName: 'insurance_2024.pdf', issueDate: daysAgo(200), expiryDate: daysFromNow(18), notes: 'Comprehensive cover' },
  { id: 'doc-2', vehicleId: 'veh-1', docType: 'registration_certificate', fileName: 'registration.pdf', issueDate: daysAgo(300), expiryDate: daysFromNow(65), notes: null },
  { id: 'doc-3', vehicleId: 'veh-1', docType: 'purchase_invoice', fileName: 'invoice_2021.pdf', issueDate: daysAgo(1100), expiryDate: null, notes: 'Original purchase' },
  { id: 'doc-4', vehicleId: 'veh-2', docType: 'insurance_policy', fileName: 'insurance_2024.pdf', issueDate: daysAgo(150), expiryDate: daysFromNow(215), notes: null },
  { id: 'doc-5', vehicleId: 'veh-2', docType: 'registration_certificate', fileName: 'registration.pdf', issueDate: daysAgo(150), expiryDate: daysFromNow(12), notes: 'Renewal due soon' },
  { id: 'doc-6', vehicleId: 'veh-3', docType: 'insurance_policy', fileName: 'insurance_2023.pdf', issueDate: daysAgo(400), expiryDate: daysFromNow(-35), notes: 'EXPIRED — urgent renewal' },
  { id: 'doc-7', vehicleId: 'veh-3', docType: 'registration_certificate', fileName: 'registration.pdf', issueDate: daysAgo(500), expiryDate: daysFromNow(90), notes: null },
  { id: 'doc-8', vehicleId: 'veh-4', docType: 'insurance_policy', fileName: 'insurance_2024.pdf', issueDate: daysAgo(30), expiryDate: daysFromNow(335), notes: 'New policy' },
  { id: 'doc-9', vehicleId: 'veh-4', docType: 'registration_certificate', fileName: 'registration.pdf', issueDate: daysAgo(30), expiryDate: daysFromNow(335), notes: null },
  { id: 'doc-10', vehicleId: 'veh-5', docType: 'insurance_policy', fileName: 'insurance_2023.pdf', issueDate: daysAgo(380), expiryDate: daysFromNow(-15), notes: 'EXPIRED' },
  { id: 'doc-11', vehicleId: 'veh-5', docType: 'registration_certificate', fileName: 'registration.pdf', issueDate: daysAgo(600), expiryDate: daysFromNow(25), notes: 'Renewal due within 30 days' },
  { id: 'doc-12', vehicleId: 'veh-6', docType: 'insurance_policy', fileName: 'insurance_2024.pdf', issueDate: daysAgo(10), expiryDate: daysFromNow(355), notes: null },
  { id: 'doc-13', vehicleId: 'veh-6', docType: 'registration_certificate', fileName: 'registration.pdf', issueDate: daysAgo(10), expiryDate: daysFromNow(355), notes: null },
];

export const serviceLogs: ServiceLog[] = [
  { id: 'svc-1', vehicleId: 'veh-1', serviceDate: daysAgo(45), mileageKm: 48200, serviceType: 'Oil Change', partsReplaced: 'Oil filter, 5W-30', workshop: 'CFAO Accra', cost: 850 },
  { id: 'svc-2', vehicleId: 'veh-1', serviceDate: daysAgo(180), mileageKm: 41000, serviceType: 'Brake Pads', partsReplaced: 'Front brake pads', workshop: 'CFAO Accra', cost: 1200 },
  { id: 'svc-3', vehicleId: 'veh-1', serviceDate: daysAgo(365), mileageKm: 32000, serviceType: 'General Service', partsReplaced: 'Oil, filters, plugs', workshop: 'Toyota Ghana', cost: 2100 },
  { id: 'svc-4', vehicleId: 'veh-2', serviceDate: daysAgo(20), mileageKm: 28500, serviceType: 'Oil Change', partsReplaced: 'Oil filter, 5W-30', workshop: 'Isuzu Tema', cost: 780 },
  { id: 'svc-5', vehicleId: 'veh-2', serviceDate: daysAgo(150), mileageKm: 21000, serviceType: 'General Service', partsReplaced: 'Oil, air filter', workshop: 'Isuzu Tema', cost: 1450 },
  { id: 'svc-6', vehicleId: 'veh-3', serviceDate: daysAgo(10), mileageKm: 67000, serviceType: 'Major Repair', partsReplaced: 'Clutch assembly, flywheel', workshop: 'Mitsubishi Service Center', cost: 5400 },
  { id: 'svc-7', vehicleId: 'veh-4', serviceDate: daysAgo(5), mileageKm: 12000, serviceType: 'First Service', partsReplaced: 'Oil, filter', workshop: 'Ford Ghana', cost: 650 },
  { id: 'svc-8', vehicleId: 'veh-5', serviceDate: daysAgo(90), mileageKm: 89000, serviceType: 'Oil Change', partsReplaced: 'Oil filter', workshop: 'Local Garage', cost: 600 },
  { id: 'svc-9', vehicleId: 'veh-5', serviceDate: daysAgo(270), mileageKm: 82000, serviceType: 'Brake Pads', partsReplaced: 'Rear brake pads', workshop: 'Local Garage', cost: 950 },
  { id: 'svc-10', vehicleId: 'veh-6', serviceDate: daysAgo(3), mileageKm: 8500, serviceType: 'First Service', partsReplaced: 'Oil, filter', workshop: 'Toyota Ghana', cost: 720 },
];

export const batteryLogs: BatteryLog[] = [
  { id: 'bat-1', vehicleId: 'veh-1', installDate: daysAgo(200), replacementDate: null, brand: 'Exide', supplier: 'Auto Parts Ltd', cost: 650 },
  { id: 'bat-2', vehicleId: 'veh-2', installDate: daysAgo(100), replacementDate: null, brand: 'Varta', supplier: 'Battery World', cost: 720 },
  { id: 'bat-3', vehicleId: 'veh-3', installDate: daysAgo(500), replacementDate: daysAgo(10), brand: 'Exide', supplier: 'Auto Parts Ltd', cost: 680 },
  { id: 'bat-4', vehicleId: 'veh-4', installDate: daysAgo(30), replacementDate: null, brand: 'Bosch', supplier: 'Bosch Center', cost: 900 },
  { id: 'bat-5', vehicleId: 'veh-5', installDate: daysAgo(700), replacementDate: null, brand: 'Exide', supplier: 'Auto Parts Ltd', cost: 600 },
  { id: 'bat-6', vehicleId: 'veh-6', installDate: daysAgo(10), replacementDate: null, brand: 'Bosch', supplier: 'Bosch Center', cost: 1100 },
];

export const tyreLogs: TyreLog[] = [
  { id: 'tyr-1', vehicleId: 'veh-1', position: 'FL', installDate: daysAgo(120), replacementDate: null, brand: 'Michelin', cost: 450 },
  { id: 'tyr-2', vehicleId: 'veh-1', position: 'FR', installDate: daysAgo(120), replacementDate: null, brand: 'Michelin', cost: 450 },
  { id: 'tyr-3', vehicleId: 'veh-1', position: 'RL', installDate: daysAgo(300), replacementDate: null, brand: 'Bridgestone', cost: 420 },
  { id: 'tyr-4', vehicleId: 'veh-1', position: 'RR', installDate: daysAgo(300), replacementDate: null, brand: 'Bridgestone', cost: 420 },
  { id: 'tyr-5', vehicleId: 'veh-2', position: 'FL', installDate: daysAgo(80), replacementDate: null, brand: 'Goodyear', cost: 480 },
  { id: 'tyr-6', vehicleId: 'veh-2', position: 'FR', installDate: daysAgo(80), replacementDate: null, brand: 'Goodyear', cost: 480 },
  { id: 'tyr-7', vehicleId: 'veh-3', position: 'FL', installDate: daysAgo(400), replacementDate: daysAgo(5), brand: 'Bridgestone', cost: 400 },
  { id: 'tyr-8', vehicleId: 'veh-5', position: 'SPARE', installDate: daysAgo(200), replacementDate: null, brand: 'Michelin', cost: 450 },
];

export const revenueEntries: RevenueEntry[] = [
  { id: 'rev-1', vehicleId: 'veh-1', driverId: 'drv-1', tripDate: daysAgo(5), tripReference: 'TRP-001', route: 'Accra → Kumasi', client: 'DHL Ghana', amount: 4500 },
  { id: 'rev-2', vehicleId: 'veh-1', driverId: 'drv-1', tripDate: daysAgo(12), tripReference: 'TRP-002', route: 'Accra → Takoradi', client: 'Maersk', amount: 5200 },
  { id: 'rev-3', vehicleId: 'veh-1', driverId: 'drv-1', tripDate: daysAgo(20), tripReference: 'TRP-003', route: 'Kumasi → Tamale', client: 'Ghana Post', amount: 6800 },
  { id: 'rev-4', vehicleId: 'veh-2', driverId: 'drv-3', tripDate: daysAgo(3), tripReference: 'TRP-004', route: 'Kumasi → Sunyani', client: 'Bolloré', amount: 3800 },
  { id: 'rev-5', vehicleId: 'veh-2', driverId: 'drv-3', tripDate: daysAgo(15), tripReference: 'TRP-005', route: 'Kumasi → Cape Coast', client: 'DHL Ghana', amount: 4100 },
  { id: 'rev-6', vehicleId: 'veh-3', driverId: 'drv-4', tripDate: daysAgo(60), tripReference: 'TRP-006', route: 'Takoradi → Accra', client: 'Maersk', amount: 3200 },
  { id: 'rev-7', vehicleId: 'veh-4', driverId: 'drv-2', tripDate: daysAgo(2), tripReference: 'TRP-007', route: 'Accra → Ho', client: 'Ghana Post', amount: 5500 },
  { id: 'rev-8', vehicleId: 'veh-4', driverId: 'drv-2', tripDate: daysAgo(8), tripReference: 'TRP-008', route: 'Accra → Koforidua', client: 'DHL Ghana', amount: 2800 },
  { id: 'rev-9', vehicleId: 'veh-5', driverId: 'drv-5', tripDate: daysAgo(7), tripReference: 'TRP-009', route: 'Tarkwa → Accra', client: 'Bolloré', amount: 4900 },
  { id: 'rev-10', vehicleId: 'veh-5', driverId: 'drv-5', tripDate: daysAgo(25), tripReference: 'TRP-010', route: 'Tarkwa → Kumasi', client: 'Maersk', amount: 6200 },
  { id: 'rev-11', vehicleId: 'veh-6', driverId: 'drv-6', tripDate: daysAgo(1), tripReference: 'TRP-011', route: 'Accra → Tamale', client: 'Ghana Post', amount: 8200 },
  { id: 'rev-12', vehicleId: 'veh-6', driverId: 'drv-6', tripDate: daysAgo(6), tripReference: 'TRP-012', route: 'Accra → Bolgatanga', client: 'DHL Ghana', amount: 9100 },
];

export const accidentReports: AccidentReport[] = [
  { id: 'acc-1', vehicleId: 'veh-3', driverId: 'drv-4', accidentDate: daysAgo(40), description: 'Rear-ended at traffic light on Spintex Road', cost: 3200, driverAtFault: true },
  { id: 'acc-2', vehicleId: 'veh-5', driverId: 'drv-5', accidentDate: daysAgo(120), description: 'Side swipe on Tarkwa highway, other driver at fault', cost: 1500, driverAtFault: false },
];

export const vehiclePhotos: VehiclePhoto[] = [
  { id: 'pho-1', vehicleId: 'veh-1', category: 'exterior', caption: 'Front view, post-service', takenAt: daysAgo(45) },
  { id: 'pho-2', vehicleId: 'veh-1', category: 'exterior', caption: 'Rear view', takenAt: daysAgo(45) },
  { id: 'pho-3', vehicleId: 'veh-1', category: 'engine', caption: 'Engine bay after oil change', takenAt: daysAgo(45) },
  { id: 'pho-4', vehicleId: 'veh-3', category: 'damage', caption: 'Rear bumper damage from accident', takenAt: daysAgo(40) },
  { id: 'pho-5', vehicleId: 'veh-3', category: 'damage', caption: 'Broken tail light', takenAt: daysAgo(40) },
  { id: 'pho-6', vehicleId: 'veh-4', category: 'exterior', caption: 'Delivery day photo', takenAt: daysAgo(30) },
];

export const valuations: Valuation[] = [
  { id: 'val-1', vehicleId: 'veh-1', valuationDate: daysAgo(30), source: 'Auto Trader GH', amount: 280000, conditionNotes: 'Good condition, regular service history' },
  { id: 'val-2', vehicleId: 'veh-2', valuationDate: daysAgo(30), source: 'Dealer Estimate', amount: 340000, conditionNotes: 'Excellent condition, low mileage' },
  { id: 'val-3', vehicleId: 'veh-3', valuationDate: daysAgo(15), source: 'Appraiser', amount: 145000, conditionNotes: 'Needs clutch repair, accident damage' },
  { id: 'val-4', vehicleId: 'veh-4', valuationDate: daysAgo(10), source: 'Ford Ghana', amount: 420000, conditionNotes: 'Like new, under warranty' },
  { id: 'val-5', vehicleId: 'veh-5', valuationDate: daysAgo(60), source: 'Auto Trader GH', amount: 120000, conditionNotes: 'High mileage, wear visible' },
  { id: 'val-6', vehicleId: 'veh-6', valuationDate: daysAgo(5), source: 'Toyota Ghana', amount: 580000, conditionNotes: 'New, minimal depreciation' },
];

export function getDriver(id: string | null): Driver | undefined {
  if (!id) return undefined;
  return drivers.find(d => d.id === id);
}

export function getSupervisor(id: string): Supervisor | undefined {
  return supervisors.find(s => s.id === id);
}

export function getVehicle(id: string): Vehicle | undefined {
  return vehicles.find(v => v.id === id);
}

export function getDocumentsForVehicle(vehicleId: string): VehicleDocument[] {
  return vehicleDocuments.filter(d => d.vehicleId === vehicleId);
}

export function getServiceLogsForVehicle(vehicleId: string): ServiceLog[] {
  return serviceLogs.filter(s => s.vehicleId === vehicleId).sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
}

export function getBatteryLogsForVehicle(vehicleId: string): BatteryLog[] {
  return batteryLogs.filter(b => b.vehicleId === vehicleId);
}

export function getTyreLogsForVehicle(vehicleId: string): TyreLog[] {
  return tyreLogs.filter(t => t.vehicleId === vehicleId);
}

export function getRevenueForVehicle(vehicleId: string): RevenueEntry[] {
  return revenueEntries.filter(r => r.vehicleId === vehicleId);
}

export function getAccidentsForVehicle(vehicleId: string): AccidentReport[] {
  return accidentReports.filter(a => a.vehicleId === vehicleId);
}

export function getPhotosForVehicle(vehicleId: string): VehiclePhoto[] {
  return vehiclePhotos.filter(p => p.vehicleId === vehicleId);
}

export function getValuationsForVehicle(vehicleId: string): Valuation[] {
  return valuations.filter(v => v.vehicleId === vehicleId);
}

export function daysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}