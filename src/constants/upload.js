export const OSS_UPLOAD_CATEGORY = {
  COMMON: 'common',
  REVIEW: 'review',
  USER_AVATAR: 'user/avatar',
  SELLER_AUTH_MATERIAL: 'user/seller-auth',
  GOODS_IMAGE: 'goods/image',
}

export const UPLOAD_MAX_SIZE_MB = 5
export const UPLOAD_MAX_FILE_COUNT = 1
export const ALLOWED_IMAGE_SUFFIXES = ['jpg', 'jpeg', 'png', 'webp', 'gif']
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const IMAGE_UPLOAD_ACCEPT = ALLOWED_IMAGE_SUFFIXES.map((item) => `.${item}`).join(',')
