import axiosInstance from './axiosInstance';

interface ApiError {
  error: true;
  message: string;
}

// All functions use the shared axiosInstance which:
//  - Attaches Bearer token on every request
//  - Auto-refreshes on 401 and retries once

function errorPayload(error: unknown): ApiError {
  const e = error as { response?: { data?: { message?: string } } };
  return {
    error: true,
    message: e.response?.data?.message || 'Something went wrong',
  };
}

export const getData = async <T = unknown>(url: string): Promise<T | ApiError> => {
  try {
    const response = await axiosInstance.get(url);
    return response.data as T;
  } catch (error) {
    return errorPayload(error);
  }
};

export const postData = async <T = unknown>(url: string, formData: unknown): Promise<T | ApiError> => {
  try {
    const response = await axiosInstance.post(url, formData);
    return response.data as T;
  } catch (error) {
    return errorPayload(error);
  }
};

export const putData = async <T = unknown>(url: string, updatedData: unknown): Promise<T | ApiError> => {
  try {
    const response = await axiosInstance.put(url, updatedData);
    return response.data as T;
  } catch (error) {
    return errorPayload(error);
  }
};

export const putDataForImage = async <T = unknown>(url: string, updatedData: unknown): Promise<T | ApiError> => {
  try {
    const response = await axiosInstance.put(url, updatedData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as T;
  } catch (error) {
    return errorPayload(error);
  }
};

export const deleteData = async <T = unknown>(url: string, body: unknown = null): Promise<T | ApiError> => {
  try {
    const response = await axiosInstance.delete(url, { data: body });
    return response.data as T;
  } catch (error) {
    return errorPayload(error);
  }
};
