"use server"

import { prisma } from "@/db/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { logEvent } from "@/utils/sentry";

import { revalidatePath } from "next/cache";




export const createTicket = async (
  prevState:{success:boolean; message: string}, 
  formData: FormData
): Promise<{success: boolean; message: string}> => {

  try {
    const user = await getCurrentUser();

    if (!user) {
      logEvent('Unauthorized ticket creation attempt', 'ticket', {}, 'warning');

      return {
        success: false,
        message: 'You must be logged in to create a ticket',
      };
    }
    
    const subject = formData.get("subject") as string;
    const description = formData.get("description") as string;
    const priority = formData.get("priority") as string;
  
    if(!subject || !description || !priority) {
      logEvent(
        "validation Error: Missing tickets fields", 
        "ticket",
        { subject, description, priority },
        "warning"
      )
      return {
        success: false,
        message: "All fields are required",
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        description,
        priority,
        user: {
          connect: {id: user.id}
        }
      },
    });

    logEvent(
      `Ticket created successfully: ${ticket.id}`,
      "ticket",
      { ticket },
      "info"
    );

    revalidatePath("/tickets");

    return {
      success: true,
      message: "Ticket created successfully",
    }

  } catch (error) {
    logEvent(
      "An error occurred while creating the ticket",
      "ticket",
      { formData: Object.fromEntries(formData.entries()) },
      "error",
      error
    );

    return {
      success: false,
      message: "An error occurred while creating the ticket",
    }
  }
}

export const getTickets = async () => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      logEvent('Unauthorized access to ticket list', 'ticket', {}, 'warning');
      return [];
    }

    const tickets = await prisma.ticket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    logEvent("Fetched tickets list", "ticket", {count: tickets.length}, "info");

    return tickets;

  } catch (error) {
    logEvent("Error fetching tickets", "ticket" , {}, "error", error)
    return [];
  }
}

export const getTicketById = async (id: string) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: Number(id) },
    });

    if(!ticket) {
      logEvent("Ticket not found", "ticket", {ticketId: id}, "warning")
      return null;
    }

    return ticket;

  } catch (error) {
    logEvent("Error fetching ticket details", "ticket" , {}, "error", error)
    return null;
  }
}

// Close Ticket
export async function closeTicket(
  prevState: { success: boolean; message: string },
  formData: FormData                                                // Recibe el id del ticket desde un button envuelto en un form desde los params de /tickets/[id]
): Promise<{ success: boolean; message: string }> {

  const ticketId = Number(formData.get('ticketId'));

  if (!ticketId) {
    logEvent('Missing ticket ID', 'ticket', {}, 'warning');
    return { success: false, message: 'Ticket ID is Required' };
  }

  const user = await getCurrentUser(); 

  if (!user) {
    logEvent('Missing user ID', 'ticket', {}, 'warning');

    return { success: false, message: 'Unauthorized' };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket || ticket.userId !== user.id) {
    logEvent(
      'Unauthorized ticket close attempt',
      'ticket',
      { ticketId, userId: user.id },
      'warning'
    );

    return {
      success: false,
      message: 'You are not authorized to close this ticket',
    };
  }

  await prisma.ticket.update({ // Actualiza el ticket a cerrado
    where: { id: ticketId },
    data: { status: 'Closed' },
  });

  revalidatePath('/tickets');
  revalidatePath(`/tickets/${ticketId}`);

  return { success: true, message: 'Ticket closed successfully' };
}