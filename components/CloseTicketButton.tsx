'use client';

import { closeTicket } from '@/actions/ticket.action';
import { useActionState, useEffect } from 'react';

import { toast } from 'sonner';

// isClosed en principio es false, lo que permite que el botón se muestre.

const CloseTicketButton = ({ ticketId, isClosed }: {ticketId: number; isClosed: boolean;}) => {

  const initialState = {
    success: false,
    message: '',
  };

  const [state, formAction] = useActionState(closeTicket, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
    } else if (state.message && !state.success) {
      toast.error(state.message);
    }
  }, [state]);

  if (isClosed) return null; // Si la prop isClosed despues de la accion es true  -> no renderizar el boton

  return (
    <form action={formAction}>
      <input type='hidden' name='ticketId' value={ticketId} />
      <button
        type='submit'
        className='bg-red-500 text-white px-3 py-3 w-full rounded hover:bg-red-600 transition'
      >
        Close Ticket
      </button>
    </form>
  );
};

export default CloseTicketButton;