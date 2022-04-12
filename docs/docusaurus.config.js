module.exports = {
  title: "Freighter Documentation",
  url: "https://docs.freighter.app",
  baseUrl: "/",
  onBrokenLinks: "throw",
  favicon: "./images/logo.png",
  organizationName: "@stellar",
  projectName: "freighterDocs",
  themeConfig: {
    navbar: {
      title: "Freighter Documentation",
      logo: {
        alt: "Freighter Logo",
        src: "./images/logo.png",
        srcDark: "./images/logo.png",
      },
      items: [
        {
          href: "https://github.com/stellar/lyra/tree/master/docs",
          label: "GitHub",
          position: "left",
        },
      ],
    },
    footer: {
      links: [
        {
          title: "Questions or comments?",
          items: [
            {
              label: "Let us know!",
              to: "https://stellarform.typeform.com/to/r4FiNpX1",
            },
          ],
        },
      ],
    },
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          // It is recommended to set document id as docs home page (`docs/` path).
          sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          editUrl: "https://github.com/stellar/lyra/tree/master/docs/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
};
