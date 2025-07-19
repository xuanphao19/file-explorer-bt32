//  js/service.js

import { apiRequest } from "./apiHelper";

// const apiUrl = "http://localhost:3000/filesystem";
const apiUrl = "https://json-server-api-production-5a96.up.railway.app/filesystem";

export const service = {
  getAll: () => apiRequest("get", apiUrl),
  getById: (id) => apiRequest("get", `${apiUrl}/${id}`),
  getByQuery: (param) => {
    const queryString = new URLSearchParams(param).toString();
    return apiRequest("get", `${apiUrl}?${queryString}`);
  },
  create: (file) => apiRequest("post", apiUrl, file),
  update: (id, updatedFile) => apiRequest("put", `${apiUrl}/${id}`, updatedFile),
  patch: (id, partialFile) => apiRequest("patch", `${apiUrl}/${id}`, partialFile),
  delete: (id) => apiRequest("delete", `${apiUrl}/${id}`),
};
