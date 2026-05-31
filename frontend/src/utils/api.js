import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wt_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
