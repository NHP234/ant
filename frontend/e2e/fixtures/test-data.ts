export const API_BASE = 'http://127.0.0.1:8080/api'

export const E2E_RUN_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
export const E2E_SHORT_ID = `${Date.now().toString().slice(-10)}${Math.random().toString(36).slice(2, 4)}`

export const ADMIN = {
  username: 'admin',
  password: 'Admin@123',
}

export const STUDENT = {
  username: `e2e_student_${E2E_RUN_ID}`,
  password: 'Test@123456',
  email: `e2e_student_${E2E_RUN_ID}@test.local`,
  fullName: 'E2E Test Student',
  studentId: `E2E${E2E_RUN_ID}`,
}

export const TEST_BOOK = {
  title: `E2E Test Book ${E2E_RUN_ID}`,
  author: 'E2E Author',
  isbn: `E2E-${E2E_SHORT_ID}`,
  quantity: 3,
}

export const TEST_CATEGORY = {
  name: `E2E Category ${E2E_RUN_ID}`,
}
