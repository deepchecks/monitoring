type Selected = readonly number[];

export const selectMultiple = (
  event: React.MouseEvent<unknown>,
  id: number,
  selected: Selected,
  setSelected: React.Dispatch<React.SetStateAction<Selected>>
) => {
  const selectedIndex = selected.indexOf(id);
  let newSelected: readonly number[] = [];

  if (selectedIndex === -1) {
    newSelected = newSelected.concat(selected, id);
  } else if (selectedIndex === 0) {
    newSelected = newSelected.concat(selected.slice(1));
  } else if (selectedIndex === selected.length - 1) {
    newSelected = newSelected.concat(selected.slice(0, -1));
  } else if (selectedIndex > 0) {
    newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
  }

  setSelected(newSelected);
};

export const isSelected = (id: number, selected: Selected) => selected.indexOf(id) !== -1;
