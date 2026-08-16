/**
 * NGP-branded SweetAlert2 helpers.
 * Centralises styling so all dialogs share the same look & feel.
 */
import Swal, { SweetAlertResult } from 'sweetalert2'

// ---------------------------------------------------------------------------
// Base instance pre-configured with NGP brand colours and dark-glass styling
// ---------------------------------------------------------------------------
const Ngp = Swal.mixin({
  background: '#18181b',          // zinc-900
  color: '#fafafa',               // zinc-50
  confirmButtonColor: '#f97316',  // orange-500
  cancelButtonColor: '#3f3f46',   // zinc-700
  customClass: {
    popup:          'rounded-2xl border border-zinc-800 shadow-2xl',
    title:          'text-white text-base font-bold',
    htmlContainer:  'text-zinc-400 text-sm',
    confirmButton:  '!rounded-lg !font-bold !uppercase !tracking-wider !text-black !text-xs !px-5 !py-2.5 hover:!bg-orange-400',
    cancelButton:   '!rounded-lg !font-bold !uppercase !tracking-wider !text-white !text-xs !px-5 !py-2.5 hover:!bg-zinc-600',
    icon:           'border-0',
  },
})

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** ✅ Success toast — slides in from top-right */
export const showSuccess = (title: string, message?: string) =>
  Ngp.fire({
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
  Ngp.fire({
    icon: 'error',
    title,
    text: message,
  })

/** ⚠️ Warning / info dialog (not destructive) */
export const showWarning = (title: string, message?: string) =>
  Ngp.fire({
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
  const result: SweetAlertResult = await Ngp.fire({
    icon: 'warning',
    title,
    html: `<span class="text-zinc-400 text-sm">${message}</span>`,
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
  const result: SweetAlertResult = await Ngp.fire({
    icon: 'question',
    title,
    html: `<span class="text-zinc-400 text-sm">${message}</span>`,
    showCancelButton: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: 'Cancel',
    reverseButtons: true,
  })
  return result.isConfirmed
}
