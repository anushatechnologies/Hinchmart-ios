/**
 * HINCH MART — Company Types
 */

export interface Company {
  id: string;
  name: string;
  logo: string;
  registrationNumber: string;
  industry: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  address: CompanyAddress;
  employees: Employee[];
  projects: Project[];
  totalEmployees: number;
  totalProjects: number;
  isVerified: boolean;
  createdAt: string;
}

export interface CompanyAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export type EmployeeRole = 'owner' | 'admin' | 'manager' | 'procurement' | 'viewer';

export interface Employee {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: EmployeeRole;
  department: string;
  permissions: EmployeePermission[];
  isActive: boolean;
  joinedAt: string;
}

export interface EmployeePermission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed';
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  currency: string;
  manager: string;
  team: string[];
}
