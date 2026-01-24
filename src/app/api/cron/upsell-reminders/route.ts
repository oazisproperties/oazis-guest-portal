import { NextRequest, NextResponse } from 'next/server';
import { getPendingUpsellsForReminder } from '@/lib/upsell-requests';
import { sendUpsellReminderSlack } from '@/lib/notifications';

// This endpoint should be called daily by Vercel Cron
// It sends reminders for upsells with check-in exactly 3 days away

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Calculate the date range for check-ins exactly 3 days from now
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const threeDaysFromNowEnd = new Date(threeDaysFromNow);
    threeDaysFromNowEnd.setHours(23, 59, 59, 999);

    console.log(`Checking for upsell reminders for check-ins on ${threeDaysFromNow.toISOString().split('T')[0]}`);

    // Get approved upsells with check-in 3 days from now
    const upsellsToRemind = await getPendingUpsellsForReminder(threeDaysFromNow, threeDaysFromNowEnd);

    console.log(`Found ${upsellsToRemind.length} upsells to remind about`);

    let sentCount = 0;

    for (const upsell of upsellsToRemind) {
      // Only remind if approved more than 3 days before check-in
      if (upsell.approvedAt && upsell.checkInDate) {
        const approvedDate = new Date(upsell.approvedAt);
        const checkInDate = new Date(upsell.checkInDate);
        const daysBetween = Math.floor((checkInDate.getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysBetween >= 3) {
          await sendUpsellReminderSlack({
            guestName: upsell.guestName || 'Guest',
            propertyName: upsell.propertyName || 'Property',
            checkInDate: upsell.checkInDate,
            items: upsell.items,
            totalAmount: upsell.totalAmount,
            reservationId: upsell.reservationId,
          });
          sentCount++;
          console.log(`Sent reminder for upsell ${upsell.id}`);
        } else {
          console.log(`Skipping upsell ${upsell.id} - approved less than 3 days before check-in`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} upsell reminders`,
      checkedDate: threeDaysFromNow.toISOString().split('T')[0],
      totalFound: upsellsToRemind.length,
      sentCount,
    });
  } catch (error) {
    console.error('Error processing upsell reminders:', error);
    return NextResponse.json(
      { error: 'Failed to process reminders' },
      { status: 500 }
    );
  }
}
