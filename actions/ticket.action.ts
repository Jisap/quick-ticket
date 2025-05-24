"use server"

import { prisma } from "@/db/prisma";
import { logEvent } from "@/utils/sentry";

import { revalidatePath } from "next/cache";




export const createTicket = async (
  prevState:{success:boolean; message: string}, 
  formData: FormData
): Promise<{success: boolean; message: string}> => {

  try {
    
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
    const tickets = await prisma.ticket.findMany({
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