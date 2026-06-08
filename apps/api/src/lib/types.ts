export type AppVariables = {
  userId: string;
  role: "doctor" | "receptionist";
};

export type Status = 400 | 401 | 403 | 404 | 409 | 410 | 422 | 500;
