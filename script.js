(() => {
  const header = document.querySelector('.header');
  if (!header) {
    return;
  }

  const nav = header.querySelector('.nav');
  const toggle = header.querySelector('.nav-toggle');

  if (!nav || !toggle) {
    return;
  }

  document.body.classList.add('js-nav');

  const links = Array.from(nav.querySelectorAll('a'));
  links.forEach((link, index) => {
    link.style.setProperty('--delay', `${index * 60}ms`);
  });

  const setOpen = (open) => {
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('menu-open', open);

    if (open) {
      nav.style.maxHeight = `${nav.scrollHeight}px`;
    } else {
      nav.style.maxHeight = '';
    }
  };

  toggle.addEventListener('click', () => {
    setOpen(!header.classList.contains('is-open'));
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      setOpen(false);
    }
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) {
      setOpen(false);
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) {
      setOpen(false);
    }
  });
})();
