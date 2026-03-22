export const COPY = {
  app: {
    name: 'Mira',
    tagline: 'Chat is where ideas are born. Studio is where ideas are forced into truth.',
  },
  send: {
    heading: 'Idea captured.',
    subheading: 'Define it or let it go.',
    ctaPrimary: 'Define in Studio',
    ctaIcebox: 'Send to Icebox',
    ctaKill: 'Kill it now',
  },
  drill: {
    heading: "Let's define this.",
    progress: 'Step {current} of {total}',
    steps: {
      intent: {
        question: 'What is this really?',
        hint: 'Strip the excitement. What is the actual thing?',
      },
      success_metric: {
        question: 'How do you know it worked?',
        hint: "One metric. If you can't name it, the idea isn't ready.",
      },
      scope: {
        question: 'How big is this?',
        hint: 'Be honest. Scope creep starts here.',
      },
      path: {
        question: 'How does this get built?',
        hint: 'Solo, assisted, or fully delegated?',
      },
      priority: {
        question: 'Does this belong now?',
        hint: 'What would you not do if you commit to this?',
      },
      decision: {
        question: "What's the call?",
        hint: 'Arena, Icebox, or Kill. No limbo.',
      },
    },
    cta: {
      next: 'Next →',
      back: '← Back',
      commit: 'Commit to Arena',
      icebox: 'Send to Icebox',
      kill: 'Kill this idea',
    },
  },
  arena: {
    heading: 'In Progress',
    empty: 'No active projects. Define an idea to get started.',
    limitReached: "You're at capacity. Ship or kill something first.",
    limitBanner: 'Active limit: {count}/{max}',
  },
  icebox: {
    heading: 'Icebox',
    empty: 'Nothing deferred. Ideas are either in play or gone.',
    staleWarning: 'This idea has been here for {days} days. Time to decide.',
  },
  shipped: {
    heading: 'Trophy Room',
    empty: 'Nothing shipped yet. Get one idea to the finish line.',
  },
  killed: {
    heading: 'Graveyard',
    empty: "Nothing killed. Good ideas die too — that's how focus works.",
    resurrection: 'Resurrect',
  },
  inbox: {
    heading: 'Inbox',
    empty: 'No new events.',
  },
  common: {
    loading: 'Working...',
    error: 'Something went wrong.',
    confirm: 'Are you sure?',
    cancel: 'Cancel',
    save: 'Save',
  },
}
