export const MENU_CONTENT = {
  city: {
    about_btn: 'About map',
    about_text: 'Common Ground\n\nA shared map of how people experience places around them.',
    about_contact: {
      prefix: 'Get in touch',
      links: [
        { text: 'hi@commonground.page', href: 'mailto:hi@commonground.page' },
      ],
      legal: [
        { text: 'Terms of Use', href: '/legal/terms-of-use' },
        { text: 'Privacy Policy', href: '/legal/privacy-policy' },
      ],
    },
  },
  event: {
    about_btn: 'About map',
    about_text: 'Interactive event maps by Event CG',
    about_link: { match: 'Event CG', href: 'https://eventcg.co', bold: true },
    about_contact: {
      prefix: 'Get in touch',
      links: [
        { text: 'hi@eventcg.co', href: 'mailto:hi@eventcg.co' },
      ],
      legal: [
        { text: 'Terms of Use', href: '/legal/terms-of-use' },
        { text: 'Privacy Policy', href: '/legal/privacy-policy' },
      ],
    },
    // серый блок под контактами (если есть — контакты идут основным цветом сразу под текстом)
    about_footer: 'Powered by Common Ground\nA shared map of how people experience places around them, from city streets to venues',
  },
}
