import * as ui from "../ui";
import * as React from "react";
import * as tab from "./tab";
import {server} from "../../socket/socketClient";
import * as commands from "../commands/commands";

import {CodeEditor} from "../codemirror/codeEditor"; 

export interface Props extends tab.ComponentProps {
}
export interface State {
}

export class Code extends React.Component<Props, State> implements tab.TabComponent {
    constructor(props: Props) {
        super(props);
        this.state = {
            content: ''
        };
    }
    
    refs: { [string: string]: any; editor: CodeEditor; }
    
    filePath: string;
    componentDidMount() {
        this.filePath = this.props.url;
        server.openFile({ filePath: this.filePath }).then((res) => {
            this.refs.editor.setValue(res.contents, true);
            commands.onDidOpenFile.emit({ filePath: this.props.url });
        });
    }

    render() {
        return (
            <CodeEditor
                ref='editor'
                path={this.props.url}
                onEdit={this.onEdit}
              />    
        );
        
        return <div>
            Code to go here : {this.props.url}
        </div>;
    }
    
    
    onEdit = (edit:CodeEdit) => {
        server.editFile({ filePath: this.filePath, edit: edit });
    }
    
    focus = () => {
        this.refs.editor.focus();
    }

    save = () => {
        server.saveFile({ filePath: this.filePath });
    }
}


export class CodeTab implements tab.OldTabInstance {
    constructor(public url: string) {
    }
    getElement = (index: number) => <Code ref={tab.getRef(this.url, index)} key={tab.getRef(this.url, index)} url={this.url}/>;
    getTitle = () => `${this.url}`;
}