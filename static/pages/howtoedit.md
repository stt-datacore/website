---
title: How to edit pages
---

## Option 1 - faster if you're familiar with GitHub

The source of truth for all of the site content is [its GitHub repo](https://github.com/TemporalAgent7/datacore). All the crew pages are stored as Markdown with a few metadata entries in the /static/crew folder.

You can use the normal Git process for submitting changes (fork the repo, create a branch, make all the changes you want and submit a PR).

## Option 2 - the more accessible way

On a crew page, click on the **Edit big book content** button:

<img src="/media/uploads/howtoedit_1.png" style="max-width: 100%" />

You will be taken to a CMS login page like this:

<img src="/media/uploads/howtoedit_2.png" style="max-width: 100%" />

Click on the **Logint with GitHub** button; you will be taken to the crew edit page:

<img src="/media/uploads/howtoedit_3.png" style="max-width: 100%" />

Make the changes you want, then click on the **Save** button at the top of the page.

Then on the **Set** drodown, switch from *Draft* to *Ready*. If you want to update multiple pages, you can go back and open a different crew page. Once you accumulated all the changes you want, click on the **Publish** button.

If you are on the collaborators list, this will immediately start a build of the website and it will be live in ~20 minutes. If you're not in the collaborators list, this will publish a PR on GitHub and once approved by a collaborator, it will be built and live in ~20 minutes.

###Thank you!