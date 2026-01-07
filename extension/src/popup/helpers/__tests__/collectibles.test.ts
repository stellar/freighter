import { getUserCollections } from "../collectibles";

describe("getUserCollections", () => {
  it("should return an empty array if the collections are empty", () => {
    const userCollections = getUserCollections({
      collections: [],
      publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
    });
    expect(userCollections).toEqual([]);
  });
  it("should return an empty array if the collections have no collection", () => {
    const userCollections = getUserCollections({
      collections: [{}],
      publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
    });
    expect(userCollections).toEqual([]);
  });
  it("should return the user collections", () => {
    // test for the following scenarios:
    // 1. user has collections with collectibles that are both owned by user and not owned by the user
    // 2. user has collections with collectibles that are owned by the user
    // 3. user has collections with collectibles that are not owned by the user
    const userCollections = getUserCollections({
      collections: [
        {
          // collection with collectibles that are both owned by user and not owned by the user
          collection: {
            address: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA", // Using XLM contract address for testing
            name: "Stellar Frogs1",
            symbol: "SFROG",
            collectibles: [
              {
                collectionAddress:
                  "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                collectionName: "Stellar Frogs1",
                owner:
                  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
                tokenId: "1",
                tokenUri: "https://nftcalendar.io/token/1",
                metadata: {
                  image:
                    "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
                  name: "Stellar Frog 1",
                  description: "This is a test frog",
                  attributes: [
                    {
                      traitType: "Background",
                      value: "Green",
                    },
                  ],
                },
              },
              {
                collectionAddress:
                  "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                collectionName: "Stellar Frogs1",
                owner:
                  "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
                tokenId: "2",
                tokenUri: "https://nftcalendar.io/token/2",
                metadata: {
                  externalUrl: "https://nftcalendar.io/external/2",

                  image:
                    "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
                  name: "Stellar Frog 2",
                  description: "This is a test frog",
                  attributes: [
                    {
                      traitType: "Background",
                      value: "Red",
                    },
                  ],
                },
              },
              {
                collectionAddress:
                  "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                collectionName: "Stellar Frogs1",
                owner:
                  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
                tokenId: "3",
                tokenUri: "https://nftcalendar.io/token/2",
                metadata: {
                  externalUrl: "https://nftcalendar.io/external/2",

                  image:
                    "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
                  name: "Stellar Frog 3",
                  description: "This is a test frog",
                  attributes: [
                    {
                      traitType: "Background",
                      value: "Red",
                    },
                  ],
                },
              },
            ],
          },
        },
        // collection with collectibles that are owned by the user
        {
          collection: {
            address: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWM3",
            name: "Stellar Frogs2",
            symbol: "SFROG2",
            collectibles: [
              {
                collectionAddress:
                  "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                collectionName: "Stellar Frogs2",
                owner:
                  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
                tokenId: "1",
                tokenUri: "https://nftcalendar.io/token/1",
                metadata: {
                  image:
                    "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
                  name: "Stellar Frog 1",
                  description: "This is a test frog",
                  attributes: [
                    {
                      traitType: "Background",
                      value: "Green",
                    },
                  ],
                },
              },
            ],
          },
        },
        // collection with collectibles that are not owned by the user
        {
          collection: {
            address: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWM3",
            name: "Stellar Frogs3",
            symbol: "SFROG3",
            collectibles: [
              {
                collectionAddress:
                  "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
                collectionName: "Stellar Frogs3",
                owner:
                  "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
                tokenId: "1",
                tokenUri: "https://nftcalendar.io/token/1",
                metadata: {
                  image:
                    "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
                  name: "Stellar Frog 1",
                  description: "This is a test frog",
                  attributes: [
                    {
                      traitType: "Background",
                      value: "Green",
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
      publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
    });
    expect(userCollections).toEqual([
      {
        collection: {
          address: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA", // Using XLM contract address for testing
          name: "Stellar Frogs1",
          symbol: "SFROG",
          collectibles: [
            {
              collectionAddress:
                "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
              collectionName: "Stellar Frogs1",
              owner: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
              tokenId: "1",
              tokenUri: "https://nftcalendar.io/token/1",
              metadata: {
                image:
                  "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
                name: "Stellar Frog 1",
                description: "This is a test frog",
                attributes: [
                  {
                    traitType: "Background",
                    value: "Green",
                  },
                ],
              },
            },
            {
              collectionAddress:
                "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
              collectionName: "Stellar Frogs1",
              owner: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
              tokenId: "3",
              tokenUri: "https://nftcalendar.io/token/2",
              metadata: {
                externalUrl: "https://nftcalendar.io/external/2",

                image:
                  "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
                name: "Stellar Frog 3",
                description: "This is a test frog",
                attributes: [
                  {
                    traitType: "Background",
                    value: "Red",
                  },
                ],
              },
            },
          ],
        },
      },
      {
        collection: {
          address: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWM3",
          name: "Stellar Frogs2",
          symbol: "SFROG2",
          collectibles: [
            {
              collectionAddress:
                "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
              collectionName: "Stellar Frogs2",
              owner: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
              tokenId: "1",
              tokenUri: "https://nftcalendar.io/token/1",
              metadata: {
                image:
                  "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
                name: "Stellar Frog 1",
                description: "This is a test frog",
                attributes: [
                  {
                    traitType: "Background",
                    value: "Green",
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
  });
});
