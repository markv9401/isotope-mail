import React from 'react';
import {shallow} from 'enzyme/build/index';
import FolderItem from '../folder-item';

describe('FolderItem component test suite', () => {
  test('Snapshot render, should render FolderItem', () => {
    const props = {
      className: 'the-one-percent', graphic: 'Andy Warhol', label: 'Red Label',
      selected: true, unreadMessageCount: 13, newMessageCount: 37};
    const folderItem = shallow(<FolderItem {...props} />);
    expect(folderItem).toMatchSnapshot();
  });
  test('component events, events fired', () => {
    // Given
    const onDrop = jest.fn();
    const onClick = jest.fn();
    const folderItem = shallow(<FolderItem label={''} selected={false} onDrop={onDrop} onClick={onClick}/>);

    // When
    folderItem.find('.listItem').simulate('drop', {preventDefault: () => {}});
    folderItem.find('.listItem').simulate('dragOver', {
      preventDefault: () => {}, dataTransfer: {types: ['application/hal+json', 'text/plain', 'application/json']}});
    folderItem.find('.listItem').simulate('click');

    // Then
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
