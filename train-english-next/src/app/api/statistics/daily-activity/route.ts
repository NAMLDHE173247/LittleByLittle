import { NextRequest, NextResponse } from "next/server";
import { DailyActivity } from "@/lib/db/models/DailyActivity";
import { verifyAuth } from "@/lib/utils/auth";
import dbConnect from "@/lib/db/connection";

export async function GET(req: NextRequest) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    await dbConnect();
    
    const userId = authUser.id;

    // Lấy mốc thời gian của 365 ngày trước (1 năm)
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 365);
    const limitDateString = limitDate.toLocaleDateString('en-CA'); // Format: YYYY-MM-DD

    // Query DB: Lấy data và sắp xếp từ cũ đến mới (Cần thiết để vẽ Recharts / Heatmap đúng trục X)
    const activities = await DailyActivity.find({
      userId,
      dateString: { $gte: limitDateString }
    })
    .sort({ dateString: 1 })
    .lean(); 

    return NextResponse.json({ 
      success: true, 
      data: activities 
    });

  } catch (error: any) {
    console.error('[DAILY_ACTIVITY_GET]', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}
