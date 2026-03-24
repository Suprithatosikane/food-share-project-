import axios from 'axios';

// Base API instance pointing to our backend
const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Automatically attach JWT token to every request
API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

// ==================== AUTH ====================
export const signup = (data) => API.post('/auth/signup', data);
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

// ==================== FOOD ====================
export const createFood = (data) => API.post('/food', data);
export const getFoods = () => API.get('/food');
export const getFoodById = (id) => API.get(`/food/${id}`);
export const updateFood = (id, data) => API.put(`/food/${id}`, data);
export const deleteFood = (id) => API.delete(`/food/${id}`);

// ==================== REQUESTS ====================
export const createRequest = (data) => API.post('/requests', data);
export const getRequests = () => API.get('/requests');
export const approveRequest = (id) => API.put(`/requests/${id}/approve`);
export const rejectRequest = (id) => API.put(`/requests/${id}/reject`);

// ==================== DELIVERIES ====================
export const getDeliveries = () => API.get('/deliveries');
export const acceptDelivery = (id) => API.put(`/deliveries/${id}/accept`);
export const markPicked = (id) => API.put(`/deliveries/${id}/picked`);
export const markDelivered = (id) => API.put(`/deliveries/${id}/delivered`);

export default API;
