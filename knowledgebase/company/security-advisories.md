---
title: "Security advisories"
source: contents/handbook/company/security-advisories.md
---

# Security advisories

This page contains security advisories and Common Vulnerabilities and Exposures (CVEs) related to PostHog. We maintain this page to ensure transparency and help our users stay informed about any security issues that may impact them. In the event that a security incident leads to a confirmed exposure or requires action from users we will always contact users proactively.

For coverage of other, [non-security incidents](https://posthog.com/handbook/engineering/operations/incidents), please check [our status page](https://status.posthog.com/).

## Our approach to security advisories

At PostHog, we take security seriously. Not as a checkbox, but with hardware security keys and healthy paranoia. We have a robust security program that includes:

- Regular security audits, architecture reviews, and penetration testing
- Automated code and infrastructure as code (IaC) linting
- Responsible disclosure program
- Proactive vulnerability monitoring
- Transparent communication with our community

For more information about our security practices, see our [main security page](https://posthog.com/handbook/company/security).

## Reporting security issues

Security vulnerabilities and other security related findings can be reported via our [vulnerability disclosure program](https://bugcrowd.com/engagements/posthog-vdp-pro) or by emailing [security-reports@posthog.com](mailto:security-reports@posthog.com). Valid findings will be rewarded with PostHog swag.

## Updating this page

PRs to this page which update advisories or CVEs should only occur as part of an incident and should follow all [our usual processes for an incident](https://posthog.com/handbook/engineering/operations/incidents). If you need to issue an advisory or CVE and an incident is not declared, you should declare one.

Declaring an incident will ensure that there is good internal visibility and that members of relevant teams, including our Support team, are aware. Once an advisory is posted to this page, you should also update other teams by posting in the [#tell-posthog-anything](https://posthog.slack.com/archives/C0351B1DMUY) Slack channel.

## Security best practices

Security is everyone's responsibility, so we encourage all our users and staff to follow some basic best practices within their own organizations.

- Use PostHog Cloud - [We sunset K8s deployments long ago](https://posthog.com/blog/sunsetting-helm-support-posthog) and our OSS version isn't suitable for use at scale. Use PostHog Cloud to ensure you benefit from the latest security updates.
- Use strong authentication - Always enable multi-factor authentication, strong passwords, and SSO where available. PostHog supports all of these.
- Monitor access - Regularly review who has access to your PostHog data and follow the principle of least privilege by only giving access to things people actually need.

We will always proactively reach out to affected users in the event of an advisory requiring attention or action. However, if you'd like to stay updated about future incidents or advisories, please [subscribe to our status page](https://status.posthog.com/). If you want to drink updates from the firehose, you can also follow our [GitHub repos](https://github.com/PostHog/posthog) for real-time updates about everything we do, as we're committed to working in the open wherever possible.

## Current advisories

### No active advisories

Currently, there are no active security advisories or CVEs. All is well.

## Past advisories

August 15, 2025 / PSA-2025-00001

### Advisory template

```
<p><strong>Date:</strong> August 15, 2025<br />
<strong>Advisory:</strong> PSA-2025-XXXXX<br />
<strong>Severity:</strong> Low / Medium / Critical<br />
<strong>Status:</strong>Reported / Fixed / Resolved</p>
```

```
<h4>Description</h4>
<p>Brief description of the vulnerability and its potential impact.</p>
```

```
<h4>Affected users</h4>
<ul>
```

```
<li>Confirm if the advisory is limited to specific products.</li>
<li>Confirm if the advisory is limited to either US or EU customers, or
```

```
both</li>
```

```
</ul>
<h4>Resolution</h4>
<p>Where possible, add a link to a PR. Be clear on any next steps.</p>
```

```
<h4>What we learned</h4>
```

```
<p>If there's a lesson we took to prevent this happening again, document it
```

```
briefly.</p>
```

```
<h4>Timeline</h4>
<ul>
```

```
<li><strong>Vulnerable code shipped:</strong> January 10, 2024, 00:00
```

```
UTC</li>
```

```
<li><strong>Discovered:</strong> January 10, 2024, 00:00 UTC</li>
<li><strong>Reported:</strong> January 10, 2024, 00:00 UTC</li>
<li><strong>Fixed:</strong> January 10, 2024, 00:00 UTC</li>
<li><strong>Disclosed:</strong> January 10, 2024, 00:00 UTC</li>
```

```
</ul>
```
