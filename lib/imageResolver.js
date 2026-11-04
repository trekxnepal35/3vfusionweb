// lib/imageResolver.js

import { getS3SignedUrl } from "@/lib/s3";

/*
==================================================
GET PRIMARY IMAGE
==================================================
*/

export function getPrimaryImage(page) {

  if (!page) {
    return null;
  }

  /*
  -----------------------------------------
  NEW IMAGE ARRAY
  -----------------------------------------
  */

  if (
    Array.isArray(page.images) &&
    page.images.length > 0
  ) {
    return page.images[0];
  }

  /*
  -----------------------------------------
  OLD IMAGE URL
  -----------------------------------------
  */

  if (page.imageUrl) {

    return {
      url: page.imageUrl,
      storage: "",
      key: "",
    };

  }

  return null;
}


/*
==================================================
RESOLVE SINGLE IMAGE
==================================================
*/

export async function resolveImage(image) {

  if (!image) {
    return "";
  }

  /*
  -----------------------------------------
  AWS S3
  -----------------------------------------
  */

  if (
    image.storage === "s3" &&
    image.key
  ) {

    return await getS3SignedUrl(
      image.key,
      3600
    );

  }

  /*
  -----------------------------------------
  CLOUDINARY / MANUAL URL
  -----------------------------------------
  */

  return image.url || "";
}


/*
==================================================
RESOLVE PAGE IMAGE
==================================================
*/

export async function resolvePageImage(page) {

  const image =
    getPrimaryImage(page);

  return await resolveImage(
    image
  );

}


/*
==================================================
RESOLVE MULTIPLE PAGES
==================================================
*/

export async function resolvePageImages(pages = []) {
  return await Promise.all(
    pages.map(async (page) => {
      // Resolve the main page image
      const imageUrl = await resolvePageImage(page);

      // Resolve Team Profile photo
      let teamProfile = page.teamProfile;

      if (teamProfile?.photoUrl) {
        const photoUrl = await resolveImage({
          url: teamProfile.photoUrl,
          storage: teamProfile.photoStorage,
          key: teamProfile.photoKey,
        });

        teamProfile = {
          ...teamProfile,
          photoUrl,
        };
      }

      // Resolve Professional Guide photo
      let professionalGuide = page.professionalGuide;

      if (professionalGuide?.photoUrl) {
        const photoUrl = await resolveImage({
          url: professionalGuide.photoUrl,
          storage: professionalGuide.photoStorage,
          key: professionalGuide.photoKey,
        });

        professionalGuide = {
          ...professionalGuide,
          photoUrl,
        };
      }

      return {
        ...page,
        imageUrl,
        teamProfile,
        professionalGuide,
      };
    })
  );
}