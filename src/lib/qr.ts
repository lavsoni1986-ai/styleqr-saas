import QRCode from "qrcode";

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrDataURL = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return qrDataURL;
  } catch (error) {
    console.error("QR generation error:", error);
    throw new Error("Failed to generate QR code");
  }
}

export const getRestaurantMenuUrl = (restaurantId: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/menu/${restaurantId}`;
};

export const getTableQRUrl = (token: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/menu?token=${token}`;
};
