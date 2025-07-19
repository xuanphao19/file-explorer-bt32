//  js/apiHelper.js
import axios from "axios";

export async function apiRequest(method, url, data = null) {
  try {
    const response = await axios({ method, url, data });
    return response.data;
  } catch (error) {
    console.error(`[API ERROR] ${method.toUpperCase()} ${url}`, error);
    throw error;
  }
}
