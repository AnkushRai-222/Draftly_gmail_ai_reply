export const ToastContainer = ({ toasts }) => (
  <div className="toast-container">
    {toasts.map(t => (
      <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
    ))}
  </div>
)
