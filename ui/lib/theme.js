import color from 'color';

export {colors};

const defaultColors = {
  background: 'white',
  header: 'black',
  text: '#4b5563',
  link: '#60a5fa',
  buttonPrimary: '#4B5563',
  buttonSecondary: '#e5e7eb',
};

const colors = room => {
  const currentColors = {
    ...defaultColors,
    ...room.theme?.colors,
    buttonPrimary: room.color,
  };

  return {
    ...currentColors,
    textLight: color(currentColors.text).lighten(0.1).hex(),
    textSuperLight: color(currentColors.text).lighten(0.2).hex(),
  };
};
