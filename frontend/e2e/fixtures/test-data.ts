export const API_BASE = 'http://localhost:8080/api'

export const ADMIN = {
  username: 'admin',
  password: 'Admin@123',
}

export const STUDENT = {
  username: `test_student_${Date.now()}`,
  password: 'Test@123456',
  email: `student_${Date.now()}@test.com`,
  fullName: 'Test Student',
  studentId: `TS${Date.now()}`,
}

export const TEST_BOOK = {
  title: 'E2E Test Book',
  author: 'E2E Author',
  isbn: `978-${Date.now()}`,
  quantity: 3,
}

export const TEST_CATEGORY = {
  name: 'E2E Category',
}
