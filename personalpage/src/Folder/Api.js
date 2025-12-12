import axios from "axios";
const BASE_URL = process.env.REACT_APP_BASE_URL;
const APIKey = process.env.REACT_APP_API_KEY;
// https://appstaging.datamarshall.com/qapi-revintegra/swagger/index.html

const ApiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: APIKey,
  },
});

export default ApiClient;
