import crypto from 'crypto';
import { Router } from 'express';
import { requireAuth } from '../auth';
import { asyncHandler } from '../validate';

const router = Router();
router.use(requireAuth);

/**
 * POST /api/uploads/cloudinary-signature
 *
 * Returns a signed set of params the browser can use to upload an image
 * directly to Cloudinary. The API secret NEVER leaves this server — only the
 * (non-secret) API key, cloud name, timestamp, and a signature computed from
 * them are sent back. This is Cloudinary's recommended signed-upload pattern
 * for browser uploads: https://cloudinary.com/documentation/signatures
 */
router.post(
  '/cloudinary-signature',
  asyncHandler(async (req, res) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      res.status(503).json({
        error: 'Cloudinary is not configured on the server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.',
      });
      return;
    }

    const folder = typeof req.body?.folder === 'string' && req.body.folder ? req.body.folder : 'driver-avatars';
    const timestamp = Math.round(Date.now() / 1000);

    // Cloudinary signing rule: alphabetically-sorted params as key=value pairs
    // joined with '&', with the api_secret appended (no separator), then SHA-1 hex.
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex');

    res.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    });
  })
);

export default router;
