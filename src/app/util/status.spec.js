describe("status", function() {

  beforeEach(module('odssPlatimApp.util'));

  var status;
  beforeEach(inject(function(_status_) {
    status = _status_;
    //console.log("status=", status);
  }));

  it('should have status service be defined', function() {
    expect(status).toBeDefined();
  });

  _.each(['messages', 'activities', 'errors'], function(member) {
    it("should have " +member+ " defined but empty", function() {
      expect(status[member]).toBeDefined();
      expect(status[member].any()).toBeUndefined();
    });
  });

  describe("ItemList", function() {
    var itemList;
    beforeEach(inject(function(_status_) {
      itemList = _status_.messages;
    }));

    it('should be defined', function() {
      expect(itemList).toBeDefined();
      expect(itemList.any()).toBeUndefined();
    });

    it('should add and remove items', function() {
      var id1 = itemList.add('item1');
      expect(itemList.any()).toEqual('item1');
      expect(itemList.get(id1)).toEqual('item1');
      var id2 = itemList.add('item2');
      expect(itemList.get(id2)).toEqual('item2');
      expect(['item1', 'item2']).toContain(itemList.any());

      itemList.remove(id1);
      expect(itemList.get(id1)).toBeUndefined();

      itemList.removeAll();
      expect(itemList.get(id2)).toBeUndefined();
    });

    it('should update item', function() {
      var id1 = itemList.add('item1');
      itemList.update(id1, 'item1 updated');
      expect(itemList.get(id1)).toEqual('item1 updated');
    });

    it('should report ids and values', function() {
      var id1 = itemList.add('item1');
      var id2 = itemList.add('item2');
      expect(itemList.ids()).toEqual([id1, id2]);
      expect(itemList.values()).toEqual(['item1', 'item2']);
    });

  });

});
