---
title: "Paid ads"
source: contents/handbook/marketing/paid.md
---

# Paid ads

The paid ads team exists to do two things only:

- Generate high quality new business leads for the sales team
- Convert high-intent, high-ICP-scoring engineers searching for PostHog or products we offer into signups that drive MRR growth

We don't do paid ads for general awareness of the PostHog brand - our website, content, and word of mouth are much better (and cheaper) ways to do this.

For now paid ads sits within the , but will become its own thing once we have more people. This page is for paid ads for PostHog in general. If you're looking for paid ads for our newsletter, see the [newsletter ads guide](https://posthog.com/handbook/content/newsletter-ads).

## Channels

We currently run ads on:

- Google Search - conversion
- Bing (for DuckDuckGo) - conversion
- LinkedIn - conversion + leads
- Reddit - conversion + leads
- YouTube - conversion

We have previously tried and no longer use X, Product Hunt, Carbon Ads, and Google Display, as they did not drive high quality user signups or leads. We usually focus campaigns on users in the US, Canada, UK, Germany and France, as these tend to lead to the most high quality signups and leads.

We work with [Hey](https://www.heydigital.co/) to manage these channels - they set up the campaigns and ensure that spend is paced properly. We have a shared internal Slack channel, and has 2 check-in calls with them each month.

In addition to Hey, we also have a monthly call with Google Partners who provide feedback on performance and competitive analysis on a per product basis as requested.

## Mission 1 - Generating new business leads

We have four ways we target new leads:

- ABM on LinkedIn
- ABM on Reddit
- Light prospecting on Reddit Light prospecting on LinkedIn

We use a variety of creative campaigns here which we don't list in the Handbook, as they keep changing over time. Some principles though:

- We are open to using gated content if it is fun and/or weird and/or actually useful
- Gated content must be freely available elsewhere

The full flow of how this works can be found here.

### Tracking conversion & conversion optimization

Using 3rd party trackers or pixels like Google Tag Manager is against our brand and values, so we use a combination of PostHog, BigQuery, Clay, Clearbit, & Census.

PostHog sends back anonymized (click ID) conversion data to each ad platform with conversion values based on ICP score to improve lead quality via target ROAS bidding. Our goal is to use our ads program as a powerhouse for the sales team and a key tool for onboarding users that will improve both MRR and CAC:LTV ratio.

In order to keep our privacy policy front of mind we've built a bespoke conversion tracking system that uses the following flow:

PostHog > Clearbit > BigQuery > Census > Ad Platforms.

You can learn more about this flow here here.

We take privacy seriously, and follow these principles:

- If it creates third-party cookies for us, don't do it
- All testing must align with [our privacy policy](https://posthog.com/privacy)
- Always verify what data is collected and how it is used
- Don't collect or share any user PII contained within PostHog, obviously (Including IP addresses) Limit data collection only to what is absolutely required
- Always be transparent with users about what we're collecting, if any
- All ClickIDs are considered safe to send back to each ad platform

## Mission 2 - Converting people to signup

We do this through search ads on Google and Bing, and you can find the master sheet of ad copy here.

We change up campaigns frequently, but generally run campaigns for:

- Brand
- Individual products
- Competitors

We generally turn these on and off depending on performance and spend, and review copy every 4 weeks. The flow is writes copy, reviews. We try both fun and straightforward copy. Even if the fun stuff doesn't convert super well, we keep it if it's doing ok as it helps with our brand - we know people screenshot and share it sometimes.

We aim for as much product coverage as possible unless there are compelling reasons to not do them (e.g. it's just very expensive). We prioritize ads for those products closest to our [ICP](https://posthog.com/handbook/who-we-are-building-for).

It is typically only worth running paid ads for individual products once they are generally available, with pricing, and where we feel the feature set is broadly on parity with the main competitors.

### Landing pages

We use custom presentations that match the style of our website as our landing pages. We have an [internal guide on creating presentations](https://github.com/PostHog/posthog.com/blob/915fe9ad366dcec8516bc0285af8a63d0e9c4b48/contents/handbook/engineering/posthog-com/presentations.mdx).

In addition, PostHog now allows us to copy a URL to share a set of open windows in a specified layout allowing further customization for ad landing pages.

## How we work

### Brand guidelines and creative

By default, all paid ads visual creative should be based on stuff that already exists in some form on one of:

- [Our website](https://posthog.com/)
- [Product for Engineers](https://newsletter.posthog.com/)
- [Hoggies](https://www.figma.com/design/I0VKEEjbkKUDSVzFus2Lpu/Hoggies?node-id=0-1) library
- [Merch](https://posthog.com/merch)
- Events
- [Video](https://www.youtube.com/@PostHog)
- Billboards

We take anything we've ever created there, and then repurpose/reformat/reconfigure it as an ad. This minimizes approvals - because these assets have previously been through a round of approval with design, we can use them knowing we don't need to get approval again. The only check required is then between and on the concept and/or copy. This means we are doing less creative work, but the upside is that we can move faster (and have a lot of Lego bricks to play with). works with on this.

For the copy itself, we also use the search ads copy where we can as a starting point, so we're not repeating work.

If we have a particular campaign in mind that really does require a new, one-off asset, then we request it from Lottie in [the usual way](https://posthog.com/handbook/brand/art-requests).

### Budget

maintains the media plan, which can be found here.

### Growth review

runs a monthly growth review with Charles where we look at the main performance metrics for the month prior. Here are the main sheet and commentary. For completeness, this also covers the organic funnel, though the main focus is still paid.
