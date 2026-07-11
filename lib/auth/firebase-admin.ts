import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App | undefined;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  if (getApps().length) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (clientEmail && privateKey && projectId) {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    adminApp = initializeApp({
      projectId,
    });
  }

  return adminApp;
}

export async function verifyFirebaseToken(token: string) {
  const auth = getAuth(getAdminApp());
  return auth.verifyIdToken(token);
}
