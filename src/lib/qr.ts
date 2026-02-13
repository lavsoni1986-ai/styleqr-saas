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

/** Base URL for QR codes and menu links. Set NEXT_PUBLIC_APP_URL in production (e.g. https://stylerqrestaurant.in). */
const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || "https://stylerqrestaurant.in";

export const getRestaurantMenuUrl = (restaurantId: string) => {
  return `${getBaseUrl()}/menu/${restaurantId}`;
};

export const getTableQRUrl = (token: string) => {
  return `${getBaseUrl()}/menu?token=${token}`;
};
