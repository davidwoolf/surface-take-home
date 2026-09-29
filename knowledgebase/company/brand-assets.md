---
title: "Logos, brand, hedgehogs"
source: contents/handbook/company/brand-assets.md
---

# Logos, brand, hedgehogs

Looking for brand voice, design philosophy, and visual identity guidelines? Check out our [Style guide](https://posthog.com/handbook/brand/style-guide).

Want to use our hedgehogs for your community event or article? We have [a huge library of them you can use](https://www.figma.com/design/I0VKEEjbkKUDSVzFus2Lpu/Hoggies?node-id=2226-55&t=1sj1GezTKuCfaybF-1). Can't see what you need? [Let us know](mailto:joe@posthog.com)! Please don't use AI art though. We're quite particular about our illustrations and AI just doesn't get it right.

## Logo and brand usage for third-parties

We’re really happy people want to build on top of PostHog, but we want to keep it clear when something is made by us or made by someone else. If you've built a third-party app on top of PostHog or want to partner with us in some way, here is some high-level guidance for you to bear in mind.

- We're generally OK with people using the PostHog name to describe compatibility. For example, you can say your product "works with PostHog," is "built for PostHog" or "built on PostHog".
- We're not OK with people using the PostHog name to make it look like your project is made by, endorsed by, or is officially partnered with PostHog if it isn't. So for example, while "Desktop Studio for PostHog" would be fine, "Official PostHog Desktop Studio" or "PostHog Desktop Studio" would not be.
- You can use our logo or brand assets only in unmodified form, and not as the main branding for your own project. However, you may not use our hedgehog mascot or other illustrative brand assets in any commercial or marketing materials without explicit permission, as this can imply endoresement and confuse people. You cannot make it seem like your product is an official PostHog product, or that we've endorsed your product or partnered with you if we haven't. Please make sure that logo, brand asset and name usage are consistent with the rules we've laid out in this page.

We don't like doing it, but if we spot some name, brand asset or logo usage that are inconsistent with our guidelines or brand, we will reach out to try to get that sorted out, so please try to be thoughtful about branding and try to be consistent with the guidelines we've set out here. If you have questions, please reach out to us at [marketing@posthog.com](mailto:marketing@posthog.com) for clarification.

## Logo

If you're looking for the PostHog logo, you came to the right place. Please keep the logo intact. SVG is always preferred as it will infinitely scale with no quality loss.

(Images shown below have transparent backgrounds but appear here with a solid background color.)

| Preview | Name | Vector | [PNG](https://posthog.com/brand/posthog-logo-stacked-padded.png) | PNG w/ padding* |
| --- | --- | --- | --- | --- |
|  | Standard logo | [SVG](https://posthog.com/brand/posthog-logo-stacked.svg) | PNG \| [PNG @2x](https://posthog.com/brand/posthog-logo-stacked-padded@2x.png) | PNG \| PNG @2x |
|  | Dark logo | SVG | PNG \| PNG @2x | PNG \| PNG @2x |
|  | Light logo | SVG | PNG \| PNG @2x | PNG \| PNG @2x |
|  | Logomark | SVG | PNG \| PNG @2x | PNG \| PNG @2x |
|  | Logo (stacked) | SVG | PNG \| PNG @2x | PNG \| PNG @2x |

*PNGs with padding are useful when uploading the logo to a third-party service where there is limited control over padding/margin around the logo.

When using the logo on a dark background, use the white-only version of the logo. Never modify the colors in the logomark (like changing the hedgehog's face color to white when using on a dark background).

The @2x version of PNGs are designed for [hi-dpi (or "Retina") screens](https://en.wikipedia.org/wiki/Retina_display). When using the logo in third party services that support uploading multiple versions (standard and hi-dpi), please be sure to include the @2x logo as it will appear crisper on newer devices, tablets and high resolution mobile devices.

Important: We updated our logo in 2021. (Note the square font and sharp edges on the logomark in the old version.) Please be sure to use the correct version. 👇🏼

If you have any questions or need clarification about which version to use, ask Cory, or reach out in [our community page](https://posthog.com/posts) and we'll be happy to help.

## Typography

We use Displaay's typeface called Matter SQ. (SQ = square dots.)

On the website, we use this for all text. In-product, we only use for titles and buttons.

### Building for web

On posthog.com, we use the [variable font](https://web.dev/variable-fonts/) version. This allows us to specify our own font weights, which we do for paragraph text.

Context: Matter Regular's weight is 430 and the next step up is Matter Medium at 570, so we use our own weight of 475 for paragraph text.

### Developing locally

Fonts are hosted outside of our posthog.com GitHub repo (due to licensing reasons). To protect the font files, they are restricted to loading on posthog.com and are not currently used for local development. Contributors will see the system default font load in place of Matter.

Workaround for local development Restricted to PostHog employees, it's possible to reference the font locally to see an exact replication of what will be published on posthog.com.

[global.css](https://github.com/PostHog/posthog.com/blob/master/src/styles.css) contains some commented out code which can be used, in conjunction with the [variable webfont files](https://github.com/PostHog/company-internal/blob/master/MatterSQVF.zip) (restricted to PostHog organization members). Here's how to use them:

1. Download the webfont files from the zip above

2. Extract the files and place them in /public/fonts

3. In global.css, comment out the src for both fonts with production (Cloudfront) URLs and uncomment the relative URLs.

4. Optionally use .gitignore to keep the files locally without inadvertently checking them in

Note: When submitting a PR, be sure to revert changes made to global.css

### Designing on desktop

We use 4 cuts of Displaay's Matter SQ typeface (SQ stands for square dots):

1. Bold (titles and section headers)

2. Semibold (paragraphs accompanying headers and paragraph links)

3. Regular & Regular Italic (paragraph text)

Note that Regular and Regular Italic are lighter than the font-weight we use on the web, so paragraph text in Figma mockups will look noticeably thinner than how it appears on posthog.com.

When designing ads or other content with non-paragraph text, use Semibold instead of Regular.

We have a handful of licenses for desktop use of Matter. Contact Cory if you need the desktop fonts (OTFs).

| Name | Weight | Size | Letter spacing | Line height |
| --- | --- | --- | --- | --- |
| h1 | Bold | 64px | -1% | 100% |
| h2 | Bold | 48px | -1% | 120% |
| h3 | Bold | 30px | -2% | 140% |
| h4 | Bold | 24px | -2% |  |
| h5 | Semibold | 20px | -2% |  |
| h6 | Semibold | 16px | 0 |  |
| Paragraphs accompanying large headers | Semibold | 20px | -1% | 125% |
| p | Regular | 17px |  | 175% |
| Name | Weight | Size | Letter spacing | Line height |
| p (small) | Regular | 15px |  | 150% |

## Other fonts

We use two other fonts for special purposes. Please adhere to their usage guidelines listed below.

### Squeak

Squeak is used in informal settings, generally accompanied by hedgehog artwork.

#### Usage guidelines

- When used for headlines or at larger sizes, use the Bold variant
- Only for small (description) text, use the Normal variant in regular casing. Never use for more than a couple lines of text in a row.
- Always use uppercase letters
- Letter spacing: -2%
- Line height: 100% (generally)

#### Examples

### Loud Noises

Loud Noises is used for quotes in hedgehog artwork.

#### Usage guidelines

- Only use for quotes in hedgehog artwork or where hedgehogs are otherwise communicating something
- Only use uppercase

#### Example

Loud Noises is used in the sign the hedgehog is holding: If you have questions about which font to use, please ask in #team-website - don't just do what feels right to you!

## Colors

We have two color schemes (light and dark mode), but primarily use light mode.

We use the same set of colors, and only swap out a couple hues depending on the color scheme.

Colors denoted with an asterisk (*) are the same between palettes.

| Name | Light mode | Dark mode |
| --- | --- | --- |
| Text color (at 90% opacity) | ■ #151515 | ■ #EEEFE9 |
| Background color | ■ #EEEFE9 | ■ #151515 |
| Accent | ■ #E5E7E0 | ■ #2C2C2C |
| Dashed divider line | ■ #D0D1C9 | ■ #4B4B4B |
| Red* | ■ #F54E00 |  |
| Name | Light mode | Dark mode |
| Yellow | ■ #DC9300 | ■ #F1A82C |
| Blue* | ■ #1D4AFF |  |
| Gray* | ■ #BFBFBC |  |
| Links | Use Red |  |

### Use opacity over more colors

When possible, use opacity to modify colors. This allows us to use fewer colors in our palette, which is light years easier when working with two color schemes.

| Paragraph text | rgba($value, 90%) |
| --- | --- |
| Links | rgba($value, 95%) (and semibold) |
| Links:hover | rgba($value, 100%) (and semibold) |

## Presentations

We use [Pitch](https://pitch.com/) for polished presentations (like when giving a talk). Read more about this in our

[communication guidelines](https://posthog.com/handbook/company/communication#google-docs-and-slides).

## Illustration guide

Our hedgehog mascot is called Max and we're quite particular about how he (or any of his hoggy pals) are illustrated. We're exploring AI tools for internal use, but currently ask that you don't use AI tools to create your own hedgehog art. Instead, you can follow the guidelines below, or [create a new art request](https://posthog.com/handbook/brand/art-requests). If Max is drawn in color he should always have a beige body with brown spines, arms, and legs. His arms should only bend once in the middle and he doesn't have fingers unless swearing or pointing. His feet are stubby by design and his snout lines should be visible unless obscured by a mask or beard. His expression comes mainly from his eyebrows.

He should be outlined with a strong, black monoline with consistent thickness. He should always face left, right, or straight-on but shouldn't be drawn with a side profile or from behind as he's self-conscious.

A more detailed version of this guide is available on Figma for team members.

## Hedgehog library

For team members we keep all our currently approved hedgehogs in this Figma file. This enables us to look through the library of approved hogs, and to export them at required sizes without relying on the design team.

Here's how:

1. Open the Figma file. You can manually browse, or use Cmd + F to search based on keywords such as 'happy', 'sad', or 'will smith'.

2. Select the hog you want. If needed, adjust the size using the 'Frame' menu in the top of the right-hand sidebar.

3. At the bottom of the right-hand sidebar, select the file type you need in the 'Export' menu, choose @2x, then select 'Export [filename]' to download the image.

If you can't find a suitable hog, you can [request one from the design team](https://posthog.com/handbook/brand/art-requests).

Non-team members can find some of the most-used hogs to download on [our press page](https://posthog.com/media).
