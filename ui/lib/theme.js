import color from 'color';

export {colors};

const defaultColors = {
  background: 'white',
  header: 'black',
  text: '#4b5563',
  link: '#60a5fa',
  buttonPrimary: '#403B9F',
  buttonSecondary: '#6059F0',
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
