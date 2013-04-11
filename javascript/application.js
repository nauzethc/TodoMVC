(function(){

    /*  ***********************************************************************
    *   TodoItem class
    */
    function TodoItem(title, completed) {
        this.title = title;
        this.completed = completed;
        this.id = this._getUuid();
    }
        TodoItem.prototype._getUuid = function() {
            var random, uuid = '';
            for (var i=0; i<32; i++) {
                random = Math.random() * 16 | 0;
                if (i === 8 || i === 12 || i === 16 || i === 20 ) {
                    uuid += '-';
                }
                uuid += (i === 12 ? 4 :
                        (i === 16 ? (random & 3 | 8) :
                        random)
                        ).toString( 16 );
            }
            return uuid;
        };


    /*  ***********************************************************************
    *  TodoItemCollection class
    */
    function TodoItemCollection() {
        this.todoItemList = [];
        this.changeObservers = [];
        this._load();
        return this;
    }
        TodoItemCollection.prototype.onChange = function(func) {
            this.changeObservers.push(func);
        };
        TodoItemCollection.prototype.changed = function() {
            for (var i=0; i<this.changeObservers.length; i++) {
                this.changeObservers[i]();
            }
        };
        TodoItemCollection.prototype.getTodoById = function(id) {
            for (var i=0; i<this.size(); i++) {
                if (this.todoItemList[i].id == id) return this.todoItemList[i];
            }
        };
        TodoItemCollection.prototype.getIndexById = function(id) {
            for (var i=0; i<this.size(); i++) {
                if (this.todoItemList[i].id == id) return i;
            }
        };
        TodoItemCollection.prototype.getAll = function() {
            return this.collection;
        };
        TodoItemCollection.prototype.getFiltered = function(filter) {
            var filtered = [];
            for (var i in this.todoItemList) {
                if ((filter === 'all') ||
                    (filter === 'completed' && this.todoItemList[i].completed) ||
                    (filter === 'active' && !this.todoItemList[i].completed)) {
                    filtered.push(this.todoItemList[i]);
                }
            }
            return filtered;
        };
        TodoItemCollection.prototype.create = function(text) {
            this.todoItemList.push(new TodoItem(text, false));
            this.save();
        };
        TodoItemCollection.prototype.destroy = function(id) {
            var index = this.getIndexById(id);
            if (index > -1) {
                this.todoItemList.splice(index, 1);
                this.save();
            }
        };
        TodoItemCollection.prototype.edit = function(id, text) {
            var todo = this.getTodoById(id);
            todo.title = text;
            this.save();
        };
        TodoItemCollection.prototype.clearCompleted = function() {
            var incompleted = [];
            this.each(function(todo) {
                if (!todo.completed) incompleted.push(todo);
            });
            this.todoItemList = incompleted;
            this.save();
        };
        TodoItemCollection.prototype.toggle = function(id) {
            var todo = this.getTodoById(id);
            todo.completed = !todo.completed;
            this.save();
        };
        TodoItemCollection.prototype.toggleAll = function(status) {
            this.each(function(todo) {
                todo.completed = status;
            });
            this.save();
        };
        TodoItemCollection.prototype.each = function(func) {
            for (var i=0; i<this.size(); i++) {
                func(this.todoItemList[i]);
            }
        };
        TodoItemCollection.prototype.eachFiltered = function(filter, func) {
            this.each(function(todo) {
                if ((filter === 'all') ||
                    (filter === 'completed' && todo.completed) ||
                    (filter === 'active' && !todo.completed)) {
                    func(todo);
                }
            });
        };
        TodoItemCollection.prototype.size = function() {
            return this.todoItemList.length;
        };
        TodoItemCollection.prototype.completedItems = function() {
            var completed = 0;
            this.each(function(item){
                if (item.completed) completed++;
            });
            return completed;
        };
        TodoItemCollection.prototype.incompleteItems = function() {
            return this.size() - this.completedItems();
        };
        TodoItemCollection.prototype.save = function() {
            localStorage.setItem('todo-list', JSON.stringify(this.todoItemList));
            this.changed();
        };
        TodoItemCollection.prototype._load = function() {
            var stored = localStorage.getItem('todo-list');
            if (stored && typeof(stored) != 'undefined') {
                this.todoItemList = JSON.parse(stored);
                this._migrateData();
                this.changed();
            }
        };
        TodoItemCollection.prototype._migrateData = function() {
            this.each(function(todo) {
                if (typeof(todo) === 'string') {
                    todo = new TodoItem(todo, false);
                }
                if (typeof(todo.id) === 'undefined') {
                    todo = new TodoItem(todo.title, todo.completed);
                }
            });
        };


    /*  ***********************************************************************
    *  TodoController class
    */
    function TodoController(itemCollection) {
        this.collection = itemCollection;
        this.notifyViews = this.notifyViews.bind(this);
        this.collection.onChange(this.notifyViews);
        this._views = [];
        return this;
    }
        TodoController.prototype.registerView = function(view) {
            this._views.push(view);
        };
        TodoController.prototype.notifyViews = function() {
            for (var i=0; i<this._views.length; i++) {
                this._views[i].render();
            }
        };
        TodoController.prototype.clearCompleted = function() {
            this.collection.clearCompleted();
        };
        TodoController.prototype.getIncompleteCount = function() {
            return this.collection.incompleteItems();
        };
        TodoController.prototype.getFilteredTodos = function(filter) {
            return this.collection.getFiltered(filter);
        };
        TodoController.prototype.getSize = function() {
            return this.collection.size();
        };
        TodoController.prototype.toggle = function(id) {
            this.collection.toggle(id);
        };
        TodoController.prototype.toggleAll = function(check) {
            this.collection.toggleAll(check);
        };
        TodoController.prototype.create = function(title) {
            this.collection.create(title);
        };
        TodoController.prototype.edit = function(id, title) {
            this.collection.edit(id, title);
        };
        TodoController.prototype.remove = function(id) {
            this.collection.destroy(id);
        };


    /*  ***********************************************************************
    *  TodoListView class
    */
    function TodoListView(itemCollection) {
        // Set controller
        this.controller = todoController;
        // Register view as controller listener
        this.controller.registerView(this);
        // Handlers Bindings
        this.render = this.render.bind(this); // Needed because listener on hashchange
        this.checkboxChangeHandler = this.checkboxChangeHandler.bind(this);
        this.checkAllHandler = this.checkAllHandler.bind(this);
        this.deleteButtonHandler = this.deleteButtonHandler.bind(this);
        this.newTodoHandler = this.newTodoHandler.bind(this);
        this.editItemHandler = this.editItemHandler.bind(this);
        this.updateOnKeypressHandler = this.updateOnKeypressHandler.bind(this);
        this.updateOnBlurHandler = this.updateOnBlurHandler.bind(this);
        // Events bindings
        window.addEventListener('hashchange', this.render, false);
        document.getElementById('new-todo').addEventListener(
            'keypress',
            this.newTodoHandler,
            false
        );
        document.getElementById('toggle-all').addEventListener(
            'change',
            this.checkAllHandler,
            false
        );
        this.render();
        return this;
    }
        TodoListView.prototype.render = function() {
            var filter = currentFilter();
            var list = document.getElementById('todo-list'); list.innerHTML = '';
            var todos = this.controller.getFilteredTodos(filter);
            for (var i in todos) {
                list.appendChild(this._createTodoItemElement(todos[i]));
            }
            document.getElementById('toggle-all').checked =
                (this.controller.getIncompleteCount() === 0);
        };
        TodoListView.prototype._createTodoItemElement = function(todo) {
            var item = document.createElement('li');
            item.setAttribute('id', 'li_'+todo.id);
            if (todo.completed) item.className += "completed";

            // Checkbox
            var checkbox = document.createElement('input');
            checkbox.className = 'toggle';
            checkbox.type = 'checkbox';
            checkbox.checked = todo.completed;
            checkbox.setAttribute('data-todo-id', todo.id);
            checkbox.addEventListener('change', this.checkboxChangeHandler, false);

            // Label
            var label = this._createTextElement('label', todo.title);
            label.addEventListener('dblclick', this.editItemHandler);
            label.setAttribute('data-todo-id', todo.id);

            // Delete button
            var deleteButton = document.createElement('button');
            deleteButton.className = 'destroy';
            deleteButton.setAttribute('data-todo-id', todo.id);
            deleteButton.addEventListener('click', this.deleteButtonHandler);

            // Div wrapper
            var divDisplay = document.createElement('div');
            divDisplay.className = 'view';
            divDisplay.appendChild(checkbox);
            divDisplay.appendChild(label);
            divDisplay.appendChild(deleteButton);

            // Return item
            item.appendChild(divDisplay);
            return item;
        };
        TodoListView.prototype._createTextElement = function(el, text) {
            var element = document.createElement(el);
            element.appendChild(document.createTextNode(text));
            return element;
        };
        TodoListView.prototype.checkboxChangeHandler = function(event) {
            var checkbox = event.target;
            var id = checkbox.getAttribute('data-todo-id');
            this.controller.toggle(id);
        };
        TodoListView.prototype.checkAllHandler = function(event) {
            var toggle = event.target;
            this.controller.toggleAll(toggle.checked);
        };
        TodoListView.prototype.deleteButtonHandler = function(event) {
            var button = event.target;
            var id = button.getAttribute('data-todo-id');
            this.controller.remove(id);
        };
        TodoListView.prototype.newTodoHandler = function(event) {
            if (event.keyCode === 13) {
                var todo = document.getElementById('new-todo');
                var text = todo.value.trim();
                if (text !== '') {
                    this.controller.create(todo.value);
                    todo.value = '';
                }
            }
        };
        TodoListView.prototype.editItemHandler = function(event) {
            var label = event.target;
            var id = label.getAttribute('data-todo-id');
            var todo = todoItemCollection.getTodoById(id);
            var li = document.getElementById('li_'+id);
            var input = document.createElement('input');
            input.setAttribute('data-todo-id', id);
            input.className = "edit";
            input.value = todo.title;
            input.addEventListener(
                'keypress', this.updateOnKeypressHandler);
            input.addEventListener(
                'blur', this.updateOnBlurHandler);
            li.appendChild(input);
            li.className = "editing";
            input.focus();
        };
        TodoListView.prototype.updateOnKeypressHandler = function(event) {
            if (event.keyCode === 13) {
                var input = event.target;
                var text = input.value;
                var id = input.getAttribute('data-todo-id');
                if (text === '') {
                    this.controller.remove(id);
                } else {
                    this.controller.edit(id, text);
                }
            }
        };
        TodoListView.prototype.updateOnBlurHandler = function(event) {
            var input = event.target;
            var text = input.value;
            var id = input.getAttribute('data-todo-id');
            if (text === '') {
                this.controller.remove(id);
            } else {
                this.controller.edit(id, text);
            }
        };


    /*  ***********************************************************************
    *  TodoFooterView class
    */
    function TodoFooterView(todoController) {
        // Set controller
        this.controller = todoController;
        // Register view as controller listener
        this.controller.registerView(this);
        // Handlers Bindings
        this.render = this.render.bind(this); // Needed because listener on hashchange
        this.clearButtonHandler = this.clearButtonHandler.bind(this);

        window.addEventListener('hashchange', this.render, false);
        this.render();
        return this;
    }
        TodoFooterView.prototype.render = function() {
            var len = this.controller.getSize();
            var filter = currentFilter();
            var incomplete = this.controller.getIncompleteCount();
            var footer = document.getElementById('footer');
            footer.innerHTML = '';
            footer.appendChild(this._createStats(incomplete));
            if (len > 0 && ((len - incomplete) > 0) || filter == 'completed') {
                footer.appendChild(this._createFilters(filter));
                footer.appendChild(this._createClearButton(len-incomplete));
            }
        };
        TodoFooterView.prototype._createTextElement = function(el, text) {
            var element = document.createElement(el);
            element.appendChild(document.createTextNode(text));
            return element;
        };
        TodoFooterView.prototype._createStats = function(incomplete) {
            var todoCount = document.createElement('span');
            todoCount.id = 'todo-count';
            var count = this._createTextElement('strong', incomplete);
            todoCount.appendChild(count);
            var items = (incomplete === 1) ? "item" : "items";
            todoCount.appendChild(document.createTextNode(" "+items+" left"));
            return todoCount;
        };
        TodoFooterView.prototype._createFilter = function(name, value, current) {
            var filter = document.createElement('li');
            var filterLink = this._createTextElement('a', name);
            filterLink.href = '#'+value;
            if (current == value) filterLink.className = 'selected';
            filter.appendChild(filterLink);
            return filter;
        };
        TodoFooterView.prototype._createFilters = function(filter) {
            var filterList = document.createElement('ul');
            filterList.id = 'filters';
            filterList.appendChild( this._createFilter('All', 'all', filter) );
            filterList.appendChild( this._createFilter('Active', 'active', filter) );
            filterList.appendChild( this._createFilter('Completed', 'completed', filter) );
            return filterList;
        };
        TodoFooterView.prototype._createClearButton = function(completed) {
            var button = this._createTextElement('button', 'Clear completed ('+completed+')');
            button.id = 'clear-completed';
            button.addEventListener('click', this.clearButtonHandler, false);
            return button;
        };
        TodoFooterView.prototype.clearButtonHandler = function(event) {
            this.controller.clearCompleted();
        };


    function currentFilter() {
        if (location.hash !== '' && location.hash.match(/^#all|completed|active$/)) {
            return location.hash.substr(1);
        } else {
            return 'all';
        }
    }

    // Init application
    function windowLoadHandler() {
        // Model
        todoItemCollection = new TodoItemCollection();
        // Controller
        todoController = new TodoController(todoItemCollection);
        // Views
        todoListView = new TodoListView(todoController);
        todoFooterView = new TodoFooterView(todoController);
    }
    window.addEventListener('load', windowLoadHandler, false);
}());
