/**
 * NGP-branded SweetAlert2 helpers.
 * Centralises styling so all dialogs share the same look & feel and match light/dark theme.
 */
import Swal, { SweetAlertResult } from 'sweetalert2'

// ---------------------------------------------------------------------------
// Dynamic configuration builder matching application theme (light/dark)
// ---------------------------------------------------------------------------
const fireSwal = (options: any) => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  return Swal.fire({
    background: isDark ? '#18181b' : '#ffffff',
    color: isDark ? '#fafafa' : '#09090b',
    confirmButtonColor: '#f97316',  // orange-500
    cancelButtonColor: isDark ? '#3f3f46' : '#e4e4e7',   // zinc-700 vs zinc-200
    customClass: {
      popup:          `rounded-2xl border ${isDark ? 'border-zinc-800 shadow-2xl bg-zinc-900' : 'border-zinc-200 shadow-lg bg-white'}`,
      title:          `text-base font-bold ${isDark ? 'text-white' : 'text-zinc-950'}`,
      htmlContainer:  isDark ? 'text-zinc-400 text-sm' : 'text-zinc-650 text-sm',
      confirmButton:  '!rounded-lg !font-bold !uppercase !tracking-wider !text-xs !px-5 !py-2.5 ' + (isDark ? '!text-black hover:!bg-orange-400' : '!text-white hover:!bg-orange-600'),
      cancelButton:   '!rounded-lg !font-bold !uppercase !tracking-wider !text-xs !px-5 !py-2.5 ' + (isDark ? '!text-white !bg-zinc-700 hover:!bg-zinc-600' : '!text-zinc-700 !bg-zinc-200 hover:!bg-zinc-300'),
      icon:           'border-0',
    },
    ...options,
  })
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** ✅ Success toast — slides in from top-right */
export const showSuccess = (title: string, message?: string) =>
  fireSwal({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title,
    text: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  })

/** ❌ Error dialog */
export const showError = (title: string, message?: string) =>
  fireSwal({
    icon: 'error',
    title,
    text: message,
  })

/** ⚠️ Warning / info dialog (not destructive) */
export const showWarning = (title: string, message?: string) =>
  fireSwal({
    icon: 'warning',
    title,
    text: message,
  })

/** 🗑️ Destructive confirm – returns true only when user clicks Confirm */
export const confirmDanger = async (
  title: string,
  message: string,
  confirmLabel = 'Yes, delete',
): Promise<boolean> => {
  const result: SweetAlertResult = await fireSwal({
    icon: 'warning',
    title,
    html: `<span class="text-zinc-500 dark:text-zinc-400 text-sm">${message}</span>`,
    showCancelButton: true,
    confirmButtonText: confirmLabel,
    confirmButtonColor: '#ef4444', // red-500 for destructive
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    focusCancel: true,
  })
  return result.isConfirmed
}

/** 💬 Generic confirm dialog */
export const confirmAction = async (
  title: string,
  message: string,
  confirmLabel = 'Confirm',
): Promise<boolean> => {
  const result: SweetAlertResult = await fireSwal({
    icon: 'question',
    title,
    html: `<span class="text-zinc-500 dark:text-zinc-400 text-sm">${message}</span>`,
    showCancelButton: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: 'Cancel',
    reverseButtons: true,
  })
  return result.isConfirmed
}
