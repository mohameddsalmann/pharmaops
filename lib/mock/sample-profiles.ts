import type { PatientProfile } from "@/lib/schemas/case";

export const samplePatientProfiles: Record<string, PatientProfile> = {
  john_doe: {
    name: "John Doe",
    dateOfBirth: "1985-03-15",
    address: "123 Main St, Springfield, IL 62701",
    phone: "555-0100",
    insuranceMemberId: "MEM001234",
  },
  jane_smith: {
    name: "Jane Smith",
    dateOfBirth: "1990-07-22",
    address: "456 Oak Ave, Portland, OR 97201",
    phone: "555-0200",
    insuranceMemberId: "MEM005678",
  },
  robert_johnson: {
    name: "Robert Johnson",
    dateOfBirth: "1978-11-30",
    address: "789 Pine Rd, Austin, TX 78701",
    phone: "555-0300",
    insuranceMemberId: "MEM009012",
  },
  mary_williams: {
    name: "Mary Williams",
    dateOfBirth: "1995-04-10",
    address: "321 Elm St, Denver, CO 80201",
    phone: "555-0400",
    insuranceMemberId: "MEM003456",
  },
  james_brown: {
    name: "James Brown",
    dateOfBirth: "1962-09-18",
    address: "654 Cedar Ln, Seattle, WA 98101",
    phone: "555-0500",
    insuranceMemberId: "MEM007890",
  },
  patricia_davis: {
    name: "Patricia Davis",
    dateOfBirth: "1988-12-05",
    address: "987 Birch Dr, Miami, FL 33101",
    phone: "555-0600",
    insuranceMemberId: "MEM002345",
  },
  michael_miller: {
    name: "Michael Miller",
    dateOfBirth: "1975-06-25",
    address: "147 Maple Way, Boston, MA 02101",
    phone: "555-0700",
    insuranceMemberId: "MEM006789",
  },
  linda_wilson: {
    name: "Linda Wilson",
    dateOfBirth: "1992-02-14",
    address: "258 Spruce St, Phoenix, AZ 85001",
    phone: "555-0800",
    insuranceMemberId: "MEM004567",
  },
};
